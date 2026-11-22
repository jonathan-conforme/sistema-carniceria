<?php

namespace App\Services;

use App\Http\Requests\GuardarCompraRequest;
use App\Http\Requests\GuardarDespieceRequest;
use App\Http\Requests\GuardarVentaRequest;
use App\Models\Compra;
use App\Models\Producto;
use App\Models\User;
use App\Models\Venta;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Validator;
use Throwable;

class TelegramBotService
{
    public function __construct(
        private readonly VentaService $venta_service,
        private readonly InventarioService $inventario_service,
    ) {}

    public function procesarWebhook(User $usuario, array $payload): void
    {
        $mensaje = $payload['message'] ?? null;

        if (! $mensaje || ! isset($mensaje['chat']['id'])) {
            return;
        }

        $chat_id = (string) $mensaje['chat']['id'];
        $clave_cache = "tg_flujo_{$chat_id}";
        $clave_aviso = "tg_tuvo_flujo_{$chat_id}";

        if (! isset($mensaje['text'])) {
            $this->enviarMenuPrincipal($chat_id, "👋 Hola *{$usuario->name}*, usa los botones inferiores para operar:");

            return;
        }

        $texto = trim((string) $mensaje['text']);

        if (in_array($texto, ['/start', '/menu', '❌ Cancelar', 'Cancelar'], true)) {
            Cache::forget($clave_cache);
            Cache::forget($clave_aviso);
            $this->enviarMenuPrincipal($chat_id, "👋 Hola *{$usuario->name}*, selecciona una operación:");

            return;
        }

        if ($texto === '📊 Cierre del Día') {
            Cache::forget($clave_cache);
            Cache::forget($clave_aviso);
            $this->enviarCierreDia($chat_id);

            return;
        }

        if ($texto === '📦 Ver Stock') {
            Cache::forget($clave_cache);
            Cache::forget($clave_aviso);
            $this->enviarStockActual($chat_id);

            return;
        }

        if ($texto === '👥 Ver Deudores') {
            Cache::forget($clave_cache);
            Cache::forget($clave_aviso);
            $this->enviarListaDeudores($chat_id);

            return;
        }

        if ($texto === '🥩 Registrar Venta') {
            Cache::put($clave_cache, ['flujo' => 'venta', 'paso' => 'elegir_corte', 'detalles' => []], now()->addMinutes(30));
            Cache::put($clave_aviso, true, now()->addHours(12));
            $this->pedirCorteVenta($chat_id);

            return;
        }

        if ($texto === '🔪 Despiece Parcial') {
            Cache::put($clave_aviso, true, now()->addHours(12));
            $this->iniciarDespiece($chat_id, $clave_cache);

            return;
        }

        if ($texto === '📦 Nueva Compra') {
            Cache::put($clave_cache, ['flujo' => 'compra', 'paso' => 'descripcion'], now()->addMinutes(30));
            Cache::put($clave_aviso, true, now()->addHours(12));
            $this->enviarMensaje($chat_id, "📦 *Nueva Compra*\nEscribe una descripción (ej. _Medio chancho El Corral_):", $this->tecladoCancelar());

            return;
        }

        if ($texto === '📒 Cobrar Fiado') {
            Cache::put($clave_aviso, true, now()->addHours(12));
            $this->iniciarCobroFiado($chat_id, $clave_cache);

            return;
        }

        if ($texto === '➕ Nuevo Corte') {
            Cache::put($clave_cache, ['flujo' => 'nuevo_producto', 'paso' => 'nombre'], now()->addMinutes(30));
            Cache::put($clave_aviso, true, now()->addHours(12));
            $this->enviarMensaje(
                $chat_id,
                "➕ *Nuevo Corte / Producto*\nEscribe el *nombre* del producto (ej. _Longaniza artesanal_):",
                $this->tecladoCancelar()
            );

            return;
        }

        $estado = Cache::get($clave_cache);

        if (! $estado) {
            $caduco = Cache::pull($clave_aviso, false);
            $saludo = $caduco
                ? "⏳ *Tu operación anterior caducó por inactividad (30 min)* y no se guardó.\n\n👋 Hola *{$usuario->name}*, elige una opción para empezar de nuevo:"
                : "👋 Hola *{$usuario->name}*, selecciona una operación:";

            $this->enviarMenuPrincipal($chat_id, $saludo);

            return;
        }

        try {
            match ($estado['flujo']) {
                'venta'          => $this->continuarVenta($chat_id, $clave_cache, $estado, $texto, $usuario->id),
                'despiece'       => $this->continuarDespiece($chat_id, $clave_cache, $estado, $texto, $usuario->id),
                'compra'         => $this->continuarCompra($chat_id, $clave_cache, $estado, $texto, $usuario->id),
                'cobro'          => $this->continuarCobro($chat_id, $clave_cache, $estado, $texto, $usuario->id),
                'nuevo_producto' => $this->continuarNuevoProducto($chat_id, $clave_cache, $estado, $texto),
                default          => $this->enviarMenuPrincipal($chat_id, 'Operación reiniciada.'),
            };
        } catch (Throwable $e) {
            Cache::forget($clave_cache);
            Cache::forget($clave_aviso);
            $this->enviarMenuPrincipal($chat_id, "⚠️ *Error:* {$e->getMessage()}");
        }
    }

    // =========================================================================
    // FLUJO 1: VENTA (POR LIBRAS / POR PRECIO / PESO Y PRECIO)
    // =========================================================================
    private function pedirCorteVenta(string $chat_id, string $prefijo = ''): void
    {
        $productos = Producto::activos()
            ->where('stock_libras', '>', 0)
            ->orderBy('nombre')
            ->get(['id', 'nombre', 'precio_venta_libra', 'stock_libras']);

        if ($productos->isEmpty()) {
            $this->enviarMenuPrincipal($chat_id, '⚠️ No hay stock disponible en vitrina.');

            return;
        }

        $lista_texto = $productos
            ->map(fn ($p) => "• *{$p->id}.* {$p->nombre} — \${$p->precio_venta_libra}/lb ({$p->stock_libras} lb)")
            ->implode("\n");

        $botones = $productos
            ->map(fn ($p) => ["{$p->id}. {$p->nombre} (\${$p->precio_venta_libra} | {$p->stock_libras}lb)"])
            ->push(['❌ Cancelar'])
            ->toArray();

        $mensaje = ($prefijo ? "{$prefijo}\n\n" : '')
            . "🥩 *Selecciona el corte a vender:*\n{$lista_texto}";

        $this->enviarMensaje($chat_id, $mensaje, [
            'keyboard'        => $botones,
            'resize_keyboard' => true,
        ]);
    }

    private function pedirModoVenta(string $chat_id, array $estado, string $prefijo = ''): void
    {
        $mensaje = ($prefijo ? "{$prefijo}\n\n" : '')
            . "🥩 *{$estado['producto_nombre']}* (\${$estado['precio_actual']}/lb | Disp: {$estado['stock_actual']} lb)\n"
            . "¿Cómo vas a despacharlo?\n\n"
            . "1️⃣ *Por Libras* (romana)\n"
            . "2️⃣ *Por Precio ($)* (dólares)\n"
            . "3️⃣ *Peso y Precio* (romana + cobro real)";

        $this->enviarMensaje($chat_id, $mensaje, [
            'keyboard' => [
                ['⚖️ Por Libras', '💵 Por Precio ($)'],
                ['⚖️+💵 Peso y Precio', '❌ Cancelar'],
            ],
            'resize_keyboard' => true,
        ]);
    }

    private function continuarVenta(string $chat_id, string $clave, array $estado, string $texto, int $user_id): void
    {
        if ($estado['paso'] === 'elegir_corte') {
            $id_candidato = (int) strtok($texto, '.');
            $producto = $id_candidato > 0
                ? Producto::activos()->where('stock_libras', '>', 0)->find($id_candidato)
                : Producto::activos()->where('stock_libras', '>', 0)->where('nombre', 'like', "%{$texto}%")->first();

            if (! $producto) {
                $this->pedirCorteVenta($chat_id, '⚠️ Corte no válido. Toca un botón o escribe el número del corte:');

                return;
            }

            $estado['producto_actual'] = $producto->id;
            $estado['producto_nombre'] = $producto->nombre;
            $estado['precio_actual']   = (float) $producto->precio_venta_libra;
            $estado['stock_actual']    = (float) $producto->stock_libras;
            $estado['paso']            = 'elegir_modo_venta';
            Cache::put($clave, $estado, now()->addMinutes(30));

            $this->pedirModoVenta($chat_id, $estado);

            return;
        }

        if ($estado['paso'] === 'elegir_modo_venta') {
            $normalizado = mb_strtolower(trim($texto));

            if (str_starts_with($normalizado, '$')) {
                $estado['modo_venta'] = 'precio';
                $estado['paso'] = 'ingresar_valor';
                $this->continuarVenta($chat_id, $clave, $estado, $texto, $user_id);

                return;
            }

            if ($texto === '⚖️ Por Libras' || in_array($normalizado, ['1', 'libras', 'libra', 'lb'], true)) {
                $estado['modo_venta'] = 'libras';
                $estado['paso'] = 'ingresar_valor';
                Cache::put($clave, $estado, now()->addMinutes(30));

                $this->enviarMensaje(
                    $chat_id,
                    "⚖️ Escribe las *libras de la romana* para *{$estado['producto_nombre']}* (ej. `2.70`):",
                    $this->tecladoCancelar()
                );

                return;
            }

            if ($texto === '💵 Por Precio ($)' || in_array($normalizado, ['2', 'precio', 'dolares', 'dólares'], true)) {
                $estado['modo_venta'] = 'precio';
                $estado['paso'] = 'ingresar_valor';
                Cache::put($clave, $estado, now()->addMinutes(30));

                $this->enviarMensaje(
                    $chat_id,
                    "💵 Escribe el *monto en dólares* para *{$estado['producto_nombre']}* (ej. `3` o `2.50`):",
                    $this->tecladoCancelar()
                );

                return;
            }

            if ($texto === '⚖️+💵 Peso y Precio' || in_array($normalizado, ['3', 'ambos', 'peso y precio'], true)) {
                $estado['modo_venta'] = 'ambos';
                $estado['paso'] = 'ingresar_peso_ambos';
                Cache::put($clave, $estado, now()->addMinutes(30));

                $this->enviarMensaje(
                    $chat_id,
                    "⚖️ Primero escribe las *libras reales de la romana* para *{$estado['producto_nombre']}* (ej. `2.70`):",
                    $this->tecladoCancelar()
                );

                return;
            }

            $this->pedirModoVenta($chat_id, $estado, '⚠️ Opción no reconocida. Elige una de estas formas de despacho:');

            return;
        }

        if ($estado['paso'] === 'ingresar_valor') {
            $valor = (float) ltrim(str_replace(',', '.', trim($texto)), '$ ');

            if ($valor <= 0) {
                $ejemplo = $estado['modo_venta'] === 'precio' ? 'monto en dólares (ej. `3` o `2.50`)' : 'libras de la romana (ej. `2.70`)';
                $this->enviarMensaje(
                    $chat_id,
                    "⚠️ Dato inválido. Escribe un número mayor a 0 para {$ejemplo}:",
                    $this->tecladoCancelar()
                );

                return;
            }

            $precio = max(0.01, (float) $estado['precio_actual']);

            if ($estado['modo_venta'] === 'precio') {
                $monto = round($valor, 2);
                $libras = max(0.01, round($monto / $precio, 2));
            } else {
                $libras = round($valor, 2);
                $monto = round($libras * $precio, 2);
            }

            $detalles = collect($estado['detalles'])->keyBy('producto_id');
            $existente = $detalles->get($estado['producto_actual']);

            $detalles->put($estado['producto_actual'], [
                'producto_id'   => $estado['producto_actual'],
                'nombre'        => $estado['producto_nombre'],
                'peso_libras'   => round(($existente['peso_libras'] ?? 0) + $libras, 2),
                'monto_cobrado' => round(($existente['monto_cobrado'] ?? 0) + $monto, 2),
            ]);

            $estado['ultimo_producto_id'] = $estado['producto_actual'];
            $estado['detalles'] = $detalles->values()->toArray();
            $estado['paso'] = 'accion_carrito';
            Cache::put($clave, $estado, now()->addMinutes(30));

            $this->mostrarResumenCarrito($chat_id, $estado['detalles']);

            return;
        }

        if ($estado['paso'] === 'ingresar_peso_ambos') {
            $libras = round((float) str_replace(',', '.', trim($texto)), 2);

            if ($libras <= 0) {
                $this->enviarMensaje(
                    $chat_id,
                    "⚠️ Peso inválido. Escribe las *libras reales de la romana* para *{$estado['producto_nombre']}* (ej. `2.70`):",
                    $this->tecladoCancelar()
                );

                return;
            }

            $estado['peso_temporal'] = $libras;
            $estado['paso'] = 'ingresar_precio_ambos';
            Cache::put($clave, $estado, now()->addMinutes(30));

            $this->enviarMensaje(
                $chat_id,
                "💵 Ahora escribe el *monto cobrado* por esas *{$libras} lb* (ej. `3`):",
                $this->tecladoCancelar()
            );

            return;
        }

        if ($estado['paso'] === 'ingresar_precio_ambos') {
            $monto = round((float) ltrim(str_replace(',', '.', trim($texto)), '$ '), 2);

            if ($monto <= 0) {
                $this->enviarMensaje(
                    $chat_id,
                    "⚠️ Monto inválido. Escribe el *monto cobrado* en dólares por las *{$estado['peso_temporal']} lb* (ej. `3`):",
                    $this->tecladoCancelar()
                );

                return;
            }

            $libras = (float) $estado['peso_temporal'];
            $detalles = collect($estado['detalles'])->keyBy('producto_id');
            $existente = $detalles->get($estado['producto_actual']);

            $detalles->put($estado['producto_actual'], [
                'producto_id'   => $estado['producto_actual'],
                'nombre'        => $estado['producto_nombre'],
                'peso_libras'   => round(($existente['peso_libras'] ?? 0) + $libras, 2),
                'monto_cobrado' => round(($existente['monto_cobrado'] ?? 0) + $monto, 2),
            ]);

            unset($estado['peso_temporal']);
            $estado['ultimo_producto_id'] = $estado['producto_actual'];
            $estado['detalles'] = $detalles->values()->toArray();
            $estado['paso'] = 'accion_carrito';
            Cache::put($clave, $estado, now()->addMinutes(30));

            $this->mostrarResumenCarrito($chat_id, $estado['detalles']);

            return;
        }

        if ($estado['paso'] === 'ajustar_monto') {
            $monto = round((float) ltrim(str_replace(',', '.', $texto), '$ '), 2);
            if ($monto <= 0) {
                $this->enviarMensaje(
                    $chat_id,
                    '⚠️ Monto inválido. Escribe el *monto real cobrado* al cliente (ej. `3` o `2.70`):',
                    $this->tecladoCancelar()
                );

                return;
            }

            $detalles = collect($estado['detalles'])->keyBy('producto_id');
            $item = $detalles->get($estado['ultimo_producto_id']);
            if ($item) {
                $item['monto_cobrado'] = $monto;
                $detalles->put($item['producto_id'], $item);
            }

            $estado['detalles'] = $detalles->values()->toArray();
            $estado['paso'] = 'accion_carrito';
            Cache::put($clave, $estado, now()->addMinutes(30));

            $this->mostrarResumenCarrito($chat_id, $estado['detalles']);

            return;
        }

        if ($estado['paso'] === 'ajustar_peso') {
            $libras = round((float) str_replace(',', '.', $texto), 2);
            if ($libras <= 0) {
                $this->enviarMensaje(
                    $chat_id,
                    '⚠️ Peso inválido. Escribe las *libras reales de la romana* (ej. `2.70`):',
                    $this->tecladoCancelar()
                );

                return;
            }

            $detalles = collect($estado['detalles'])->keyBy('producto_id');
            $item = $detalles->get($estado['ultimo_producto_id']);
            if ($item) {
                $item['peso_libras'] = $libras;
                $detalles->put($item['producto_id'], $item);
            }

            $estado['detalles'] = $detalles->values()->toArray();
            $estado['paso'] = 'accion_carrito';
            Cache::put($clave, $estado, now()->addMinutes(30));

            $this->mostrarResumenCarrito($chat_id, $estado['detalles']);

            return;
        }

        if ($estado['paso'] === 'accion_carrito') {
            if ($texto === '➕ Agregar otro corte') {
                $estado['paso'] = 'elegir_corte';
                Cache::put($clave, $estado, now()->addMinutes(30));
                $this->pedirCorteVenta($chat_id);

                return;
            }

            if ($texto === '💲 Ajustar cobro ($)') {
                $estado['paso'] = 'ajustar_monto';
                Cache::put($clave, $estado, now()->addMinutes(30));
                $this->enviarMensaje($chat_id, '💵 Escribe el *monto real cobrado* al cliente (ej. `3` o `2.70`):', $this->tecladoCancelar());

                return;
            }

            if ($texto === '⚖️ Ajustar romana (lb)') {
                $estado['paso'] = 'ajustar_peso';
                Cache::put($clave, $estado, now()->addMinutes(30));
                $this->enviarMensaje($chat_id, '⚖️ Escribe el *peso real de la romana* en libras (ej. `2.70`):', $this->tecladoCancelar());

                return;
            }

            $mapa_pago = [
                '💵 Efectivo'      => 'efectivo',
                '🏦 Transferencia' => 'transferencia',
                '📒 Fiado'         => 'fiado',
            ];

            if (! isset($mapa_pago[$texto])) {
                $this->mostrarResumenCarrito($chat_id, $estado['detalles'], '⚠️ Opción no válida. Elige una acción o método de pago de los botones:');

                return;
            }

            $estado['metodo_pago'] = $mapa_pago[$texto];

            if ($estado['metodo_pago'] === 'fiado') {
                $estado['paso'] = 'nombre_fiado';
                Cache::put($clave, $estado, now()->addMinutes(30));
                $this->enviarMensaje($chat_id, '✍️ Escribe el *nombre del cliente* al que se le fía:', $this->tecladoCancelar());

                return;
            }

            $this->finalizarVenta($chat_id, $clave, $estado, null, $user_id);

            return;
        }

        if ($estado['paso'] === 'nombre_fiado') {
            if (mb_strlen(trim($texto)) < 2) {
                $this->enviarMensaje($chat_id, '⚠️ Escribe un nombre válido para el cliente fiado:', $this->tecladoCancelar());

                return;
            }

            $this->finalizarVenta($chat_id, $clave, $estado, $texto, $user_id);
        }
    }

    private function mostrarResumenCarrito(string $chat_id, array $detalles, string $prefijo = ''): void
    {
        $coleccion = collect($detalles);
        $total = number_format((float) $coleccion->sum('monto_cobrado'), 2, '.', '');

        $resumen = $coleccion
            ->map(fn ($d) => "• *{$d['nombre']}:* {$d['peso_libras']} lb → *\${$d['monto_cobrado']}*")
            ->implode("\n");

        $mensaje = ($prefijo ? "{$prefijo}\n\n" : '')
            . "🛒 *Detalle actual:*\n{$resumen}\n\n💰 *Total a cobrar: \${$total}*";

        $this->enviarMensaje(
            $chat_id,
            $mensaje,
            [
                'keyboard' => [
                    ['➕ Agregar otro corte'],
                    ['💲 Ajustar cobro ($)', '⚖️ Ajustar romana (lb)'],
                    ['💵 Efectivo', '🏦 Transferencia'],
                    ['📒 Fiado', '❌ Cancelar'],
                ],
                'resize_keyboard' => true,
            ]
        );
    }

    private function finalizarVenta(string $chat_id, string $clave, array $estado, ?string $cliente, int $user_id): void
    {
        $payload = [
            'cliente'     => $cliente,
            'metodo_pago' => $estado['metodo_pago'],
            'origen'      => 'telegram',
            'detalles'    => collect($estado['detalles'])->map(fn ($d) => [
                'producto_id'   => $d['producto_id'],
                'peso_libras'   => $d['peso_libras'],
                'monto_cobrado' => $d['monto_cobrado'],
            ])->toArray(),
        ];

        $form = new GuardarVentaRequest;
        $validator = Validator::make($payload, $form->rules(), $form->messages());

        if (method_exists($form, 'after')) {
            $validator->after($form->after());
        }

        if ($validator->fails()) {
            Cache::forget($clave);
            $this->enviarMenuPrincipal($chat_id, "⚠️ *No se pudo registrar:*\n" . $validator->errors()->first());

            return;
        }

        $venta = $this->venta_service->registrarVenta($validator->validated(), $user_id);
        Cache::forget($clave);

        $etiqueta_pago = match ($venta->metodo_pago) {
            'efectivo'      => '💵 Efectivo',
            'transferencia' => '🏦 Transferencia',
            'fiado'         => "📒 Fiado ({$venta->cliente})",
        };

        $this->enviarMenuPrincipal(
            $chat_id,
            "✅ *Venta #{$venta->id} registrada*\n" .
            "Total cobrado: *\${$venta->monto_total}*\n" .
            "Pago: {$etiqueta_pago}\n" .
            "Ganancia neta: \${$venta->ganancia_total}"
        );
    }

    // =========================================================================
    // FLUJO 2: DESPIECE PARCIAL
    // =========================================================================
    private function iniciarDespiece(string $chat_id, string $clave): void
    {
        if (! $this->pedirCompraDespiece($chat_id)) {
            return;
        }

        Cache::put($clave, ['flujo' => 'despiece', 'paso' => 'elegir_compra', 'detalles' => []], now()->addMinutes(30));
    }

    private function pedirCompraDespiece(string $chat_id, string $prefijo = ''): bool
    {
        $compras = Compra::conSaldoBruto()
            ->orderByDesc('fecha_compra')
            ->get(['id', 'descripcion', 'peso_disponible_bruto_libras']);

        if ($compras->isEmpty()) {
            $this->enviarMenuPrincipal($chat_id, '⚠️ No hay compras con carne bruta disponible en cámara.');

            return false;
        }

        $lista_texto = $compras
            ->map(fn ($c) => "• *{$c->id}.* {$c->descripcion} ({$c->peso_disponible_bruto_libras} lb disp)")
            ->implode("\n");

        $botones = $compras
            ->map(fn ($c) => ["{$c->id}. {$c->descripcion} ({$c->peso_disponible_bruto_libras}lb disp)"])
            ->push(['❌ Cancelar'])
            ->toArray();

        $mensaje = ($prefijo ? "{$prefijo}\n\n" : '')
            . "🔪 *Elige la compra de cámara a picar:*\n{$lista_texto}";

        $this->enviarMensaje($chat_id, $mensaje, [
            'keyboard'        => $botones,
            'resize_keyboard' => true,
        ]);

        return true;
    }

    private function pedirPiezaDespiece(string $chat_id, string $prefijo = ''): void
    {
        $mensaje = ($prefijo ? "{$prefijo}\n\n" : '')
            . "🍖 *¿Qué pieza vas a despiezar?*\n"
            . 'Elige entre: `pierna`, `brazo`, `lomo`, `costilla` o `mixto`:';

        $this->enviarMensaje($chat_id, $mensaje, [
            'keyboard' => [
                ['pierna', 'brazo'],
                ['lomo', 'costilla'],
                ['mixto', '❌ Cancelar'],
            ],
            'resize_keyboard' => true,
        ]);
    }

    private function continuarDespiece(string $chat_id, string $clave, array $estado, string $texto, int $user_id): void
    {
        if ($estado['paso'] === 'elegir_compra') {
            $compra = Compra::conSaldoBruto()->find((int) strtok($texto, '.'));

            if (! $compra) {
                $this->pedirCompraDespiece($chat_id, '⚠️ Compra no válida. Toca una opción o escribe su número:');

                return;
            }

            $estado['compra_id'] = $compra->id;
            $estado['paso'] = 'elegir_pieza';
            Cache::put($clave, $estado, now()->addMinutes(30));

            $this->pedirPiezaDespiece($chat_id);

            return;
        }

        if ($estado['paso'] === 'elegir_pieza') {
            $pieza = mb_strtolower(trim($texto));
            if (! in_array($pieza, ['pierna', 'brazo', 'lomo', 'costilla', 'mixto'], true)) {
                $this->pedirPiezaDespiece($chat_id, '⚠️ Pieza no válida. Elige una de las opciones:');

                return;
            }

            $estado['pieza_origen'] = $pieza;
            $estado['paso'] = 'peso_bruto';
            Cache::put($clave, $estado, now()->addMinutes(30));

            $this->enviarMensaje($chat_id, '⚖️ ¿Cuántas *libras brutas* sacaste de cámara para picar?', $this->tecladoCancelar());

            return;
        }

        if ($estado['paso'] === 'peso_bruto') {
            $bruto = (float) str_replace(',', '.', $texto);

            if ($bruto <= 0) {
                $this->enviarMensaje(
                    $chat_id,
                    '⚠️ Peso inválido. Escribe un número mayor a 0 de *libras brutas* sacadas de cámara:',
                    $this->tecladoCancelar()
                );

                return;
            }

            $estado['peso_bruto_usado_libras'] = $bruto;
            $estado['paso'] = 'elegir_corte_obtenido';
            Cache::put($clave, $estado, now()->addMinutes(30));
            $this->pedirCorteDespiece($chat_id);

            return;
        }

        if ($estado['paso'] === 'elegir_corte_obtenido') {
            $permitir_guardar = ! empty($estado['detalles']);

            if ($texto === '✅ Guardar Despiece' && $permitir_guardar) {
                $this->finalizarDespiece($chat_id, $clave, $estado, $user_id);

                return;
            }

            $id_candidato = (int) strtok($texto, '.');
            $producto = $id_candidato > 0
                ? Producto::activos()->find($id_candidato)
                : Producto::activos()->where('nombre', 'like', "%{$texto}%")->first();

            if (! $producto) {
                $this->pedirCorteDespiece($chat_id, $permitir_guardar, '⚠️ Corte no válido. Elige uno de la lista o pulsa Guardar:');

                return;
            }

            $estado['corte_actual'] = $producto->id;
            $estado['corte_nombre'] = $producto->nombre;
            $estado['paso'] = 'libras_obtenidas';
            Cache::put($clave, $estado, now()->addMinutes(30));

            $this->enviarMensaje($chat_id, "⚖️ Libras limpias obtenidas de *{$producto->nombre}*:", $this->tecladoCancelar());

            return;
        }

        if ($estado['paso'] === 'libras_obtenidas') {
            $libras = (float) str_replace(',', '.', $texto);

            if ($libras <= 0) {
                $this->enviarMensaje(
                    $chat_id,
                    "⚠️ Dato inválido. Escribe un número mayor a 0 de libras limpias obtenidas de *{$estado['corte_nombre']}*:",
                    $this->tecladoCancelar()
                );

                return;
            }

            $detalles = collect($estado['detalles'])->keyBy('producto_id');
            $detalles->put($estado['corte_actual'], [
                'producto_id'      => $estado['corte_actual'],
                'nombre'           => $estado['corte_nombre'],
                'libras_obtenidas' => $libras,
            ]);

            $estado['detalles'] = $detalles->values()->toArray();
            $estado['paso'] = 'elegir_corte_obtenido';
            Cache::put($clave, $estado, now()->addMinutes(30));

            $this->pedirCorteDespiece($chat_id, true);
        }
    }

    private function pedirCorteDespiece(string $chat_id, bool $permitir_guardar = false, string $prefijo = ''): void
    {
        $productos = Producto::activos()
            ->orderBy('nombre')
            ->get(['id', 'nombre']);

        $lista_texto = $productos
            ->map(fn ($p) => "• *{$p->id}.* {$p->nombre}")
            ->implode("\n");

        $botones = $productos
            ->map(fn ($p) => ["{$p->id}. {$p->nombre}"])
            ->toArray();

        $botones[] = $permitir_guardar ? ['✅ Guardar Despiece', '❌ Cancelar'] : ['❌ Cancelar'];

        $mensaje = ($prefijo ? "{$prefijo}\n\n" : '')
            . '🥩 *Selecciona un corte obtenido' . ($permitir_guardar ? ' (o pulsa Guardar)' : '') . ":*\n{$lista_texto}";

        $this->enviarMensaje($chat_id, $mensaje, [
            'keyboard'        => $botones,
            'resize_keyboard' => true,
        ]);
    }

    private function finalizarDespiece(string $chat_id, string $clave, array $estado, int $user_id): void
    {
        $payload = [
            'compra_id'               => $estado['compra_id'],
            'pieza_origen'            => $estado['pieza_origen'],
            'peso_bruto_usado_libras' => $estado['peso_bruto_usado_libras'],
            'detalles'                => collect($estado['detalles'])->map(fn ($d) => [
                'producto_id'      => $d['producto_id'],
                'libras_obtenidas' => $d['libras_obtenidas'],
            ])->toArray(),
        ];

        $form = new GuardarDespieceRequest;
        $validator = Validator::make($payload, $form->rules(), $form->messages());

        if (method_exists($form, 'after')) {
            $validator->after($form->after());
        }

        if ($validator->fails()) {
            Cache::forget($clave);
            $this->enviarMenuPrincipal($chat_id, "⚠️ *Error en despiece:*\n" . $validator->errors()->first());

            return;
        }

        $sesion = $this->inventario_service->registrarDespiece($validator->validated(), $user_id);
        Cache::forget($clave);

        $this->enviarMenuPrincipal(
            $chat_id,
            "✅ *Despiece #{$sesion->id} guardado*\n" .
            "Bruto usado: {$sesion->peso_bruto_usado_libras} lb\n" .
            "Útil limpio: {$sesion->peso_util_obtenido_libras} lb\n" .
            "Merma calculada: *{$sesion->merma_libras} lb*\n" .
            "Nuevo costo real: *\${$sesion->costo_real_libra_sesion}/lb*"
        );
    }

    // =========================================================================
    // FLUJO 3: NUEVA COMPRA
    // =========================================================================
    private function continuarCompra(string $chat_id, string $clave, array $estado, string $texto, int $user_id): void
    {
        if ($estado['paso'] === 'descripcion') {
            if (mb_strlen(trim($texto)) < 2) {
                $this->enviarMensaje($chat_id, '⚠️ Escribe una descripción válida para la compra:', $this->tecladoCancelar());

                return;
            }

            $estado['descripcion'] = $texto;
            $estado['paso'] = 'peso';
            Cache::put($clave, $estado, now()->addMinutes(30));
            $this->enviarMensaje($chat_id, '⚖️ Peso total en *libras* (ej. `104.85`):', $this->tecladoCancelar());

            return;
        }

        if ($estado['paso'] === 'peso') {
            $peso = (float) str_replace(',', '.', $texto);
            if ($peso <= 0) {
                $this->enviarMensaje($chat_id, '⚠️ Peso inválido. Escribe el peso total en *libras* mayor a 0 (ej. `104.85`):', $this->tecladoCancelar());

                return;
            }

            $estado['peso_inicial_libras'] = $peso;
            $estado['paso'] = 'costo';
            Cache::put($clave, $estado, now()->addMinutes(30));
            $this->enviarMensaje($chat_id, '💵 Costo total pagado en *$* (ej. `196.49`):', $this->tecladoCancelar());

            return;
        }

        if ($estado['paso'] === 'costo') {
            $costo = (float) ltrim(str_replace(',', '.', $texto), '$ ');
            if ($costo <= 0) {
                $this->enviarMensaje($chat_id, '⚠️ Monto inválido. Escribe el costo total pagado en *$* mayor a 0 (ej. `196.49`):', $this->tecladoCancelar());

                return;
            }

            $payload = [
                'descripcion'         => $estado['descripcion'],
                'peso_inicial_libras' => $estado['peso_inicial_libras'],
                'costo_total'         => $costo,
                'fecha_compra'        => now()->toDateString(),
            ];

            $form = new GuardarCompraRequest;
            $validator = Validator::make($payload, $form->rules(), $form->messages());

            if ($validator->fails()) {
                Cache::forget($clave);
                $this->enviarMenuPrincipal($chat_id, '⚠️ *Error:* ' . $validator->errors()->first());

                return;
            }

            $compra = $this->inventario_service->registrarCompra($validator->validated(), $user_id);
            Cache::forget($clave);

            $this->enviarMenuPrincipal(
                $chat_id,
                "✅ *Compra #{$compra->id} ingresada a cámara*\n" .
                "Peso bruto: {$compra->peso_inicial_libras} lb\n" .
                "Costo base: *\${$compra->costo_base_libra}/lb*"
            );
        }
    }

    // =========================================================================
    // FLUJO 4: COBRAR FIADOS (ABONOS)
    // =========================================================================
    private function iniciarCobroFiado(string $chat_id, string $clave): void
    {
        if (! $this->pedirVentaFiada($chat_id)) {
            return;
        }

        Cache::put($clave, ['flujo' => 'cobro', 'paso' => 'elegir_venta'], now()->addMinutes(30));
    }

    private function pedirVentaFiada(string $chat_id, string $prefijo = ''): bool
    {
        $fiados = Venta::pendientesCobro()
            ->orderBy('created_at')
            ->get(['id', 'cliente', 'saldo_pendiente']);

        if ($fiados->isEmpty()) {
            $this->enviarMenuPrincipal($chat_id, '🎉 ¡No hay cuentas fiadas pendientes por cobrar!');

            return false;
        }

        $lista_texto = $fiados
            ->map(fn ($v) => "• *{$v->id}.* {$v->cliente} — Debe *\${$v->saldo_pendiente}*")
            ->implode("\n");

        $botones = $fiados
            ->map(fn ($v) => ["{$v->id}. {$v->cliente} (Debe \${$v->saldo_pendiente})"])
            ->push(['❌ Cancelar'])
            ->toArray();

        $mensaje = ($prefijo ? "{$prefijo}\n\n" : '')
            . "📒 *Selecciona la cuenta a cobrar:*\n{$lista_texto}";

        $this->enviarMensaje($chat_id, $mensaje, [
            'keyboard'        => $botones,
            'resize_keyboard' => true,
        ]);

        return true;
    }

    private function pedirMontoAbono(string $chat_id, string $cliente, float $saldo, string $prefijo = ''): void
    {
        $mensaje = ($prefijo ? "{$prefijo}\n\n" : '')
            . "💰 *{$cliente}* debe *\${$saldo}*.\nEscribe el monto que abona o pulsa pagar todo:";

        $this->enviarMensaje($chat_id, $mensaje, [
            'keyboard' => [
                ["Pagar todo (\${$saldo})"],
                ['❌ Cancelar'],
            ],
            'resize_keyboard' => true,
        ]);
    }

    private function pedirMetodoAbono(string $chat_id, float $monto, string $prefijo = ''): void
    {
        $mensaje = ($prefijo ? "{$prefijo}\n\n" : '')
            . "💳 Abono de *\${$monto}*. ¿Cómo pagó?";

        $this->enviarMensaje($chat_id, $mensaje, [
            'keyboard' => [
                ['💵 Efectivo', '🏦 Transferencia'],
                ['❌ Cancelar'],
            ],
            'resize_keyboard' => true,
        ]);
    }

    private function continuarCobro(string $chat_id, string $clave, array $estado, string $texto, int $user_id): void
    {
        if ($estado['paso'] === 'elegir_venta') {
            $venta = Venta::pendientesCobro()->find((int) strtok($texto, '.'));

            if (! $venta || (float) $venta->saldo_pendiente <= 0) {
                $this->pedirVentaFiada($chat_id, '⚠️ Cuenta no válida. Elige una cuenta pendiente o escribe su número:');

                return;
            }

            $estado['venta_id'] = $venta->id;
            $estado['cliente_nombre'] = $venta->cliente;
            $estado['saldo_pendiente'] = (float) $venta->saldo_pendiente;
            $estado['paso'] = 'monto';
            Cache::put($clave, $estado, now()->addMinutes(30));

            $this->pedirMontoAbono($chat_id, $venta->cliente, (float) $venta->saldo_pendiente);

            return;
        }

        if ($estado['paso'] === 'monto') {
            $monto = str_starts_with($texto, 'Pagar todo')
                ? $estado['saldo_pendiente']
                : (float) ltrim(str_replace(',', '.', $texto), '$ ');

            if ($monto <= 0 || $monto > $estado['saldo_pendiente']) {
                $this->pedirMontoAbono(
                    $chat_id,
                    $estado['cliente_nombre'],
                    $estado['saldo_pendiente'],
                    "⚠️ Monto inválido. Ingresa entre \$0.01 y \${$estado['saldo_pendiente']}:"
                );

                return;
            }

            $estado['monto_abonado'] = $monto;
            $estado['paso'] = 'metodo';
            Cache::put($clave, $estado, now()->addMinutes(30));

            $this->pedirMetodoAbono($chat_id, $monto);

            return;
        }

        if ($estado['paso'] === 'metodo') {
            $normalizado = mb_strtolower(trim($texto));
            $metodo = match (true) {
                $texto === '💵 Efectivo' || $normalizado === 'efectivo'           => 'efectivo',
                $texto === '🏦 Transferencia' || $normalizado === 'transferencia' => 'transferencia',
                default                                                           => null,
            };

            if (! $metodo) {
                $this->pedirMetodoAbono($chat_id, $estado['monto_abonado'], '⚠️ Método no válido. Elige Efectivo o Transferencia:');

                return;
            }

            $validator = Validator::make([
                'venta_id'      => $estado['venta_id'],
                'monto_abonado' => $estado['monto_abonado'],
                'metodo_pago'   => $metodo,
            ], [
                'venta_id'      => ['required', 'integer', 'exists:ventas,id'],
                'monto_abonado' => ['required', 'numeric', 'min:0.01'],
                'metodo_pago'   => ['required', 'in:efectivo,transferencia'],
            ]);

            if ($validator->fails()) {
                Cache::forget($clave);
                $this->enviarMenuPrincipal($chat_id, '⚠️ Error: ' . $validator->errors()->first());

                return;
            }

            $abono = $this->venta_service->registrarAbono($validator->validated(), $user_id);
            $venta_actualizada = Venta::find($estado['venta_id']);
            Cache::forget($clave);

            $cliente = $venta_actualizada?->cliente ?? $estado['cliente_nombre'];
            $saldo_restante = $venta_actualizada?->saldo_pendiente ?? '0.00';

            $this->enviarMenuPrincipal(
                $chat_id,
                "✅ *Abono registrado*\n" .
                "Cliente: {$cliente}\n" .
                "Abonado: *\${$abono->monto_abonado}*\n" .
                "Saldo restante: *\${$saldo_restante}*"
            );
        }
    }

    // =========================================================================
    // FLUJO 5: NUEVO CORTE / PRODUCTO RÁPIDO
    // =========================================================================
    private function continuarNuevoProducto(string $chat_id, string $clave, array $estado, string $texto): void
    {
        if ($estado['paso'] === 'nombre') {
            $nombre = trim($texto);

            if (mb_strlen($nombre) < 2) {
                $this->enviarMensaje($chat_id, '⚠️ Escribe un nombre válido (mínimo 2 letras):', $this->tecladoCancelar());

                return;
            }

            if (Producto::whereRaw('LOWER(nombre) = ?', [mb_strtolower($nombre)])->exists()) {
                $this->enviarMensaje($chat_id, "⚠️ Ya existe un corte llamado *{$nombre}*. Escribe otro nombre o cancela:", $this->tecladoCancelar());

                return;
            }

            $estado['nombre'] = $nombre;
            $estado['paso'] = 'precio';
            Cache::put($clave, $estado, now()->addMinutes(30));

            $this->enviarMensaje(
                $chat_id,
                "💵 ¿A cuánto vas a vender la libra de *{$nombre}*? (ej. `3.25`):",
                $this->tecladoCancelar()
            );

            return;
        }

        if ($estado['paso'] === 'precio') {
            $precio = round((float) ltrim(str_replace(',', '.', $texto), '$ '), 2);

            if ($precio <= 0) {
                $this->enviarMensaje($chat_id, '⚠️ Ingresa un precio por libra mayor a 0 (ej. `3.25`):', $this->tecladoCancelar());

                return;
            }

            $estado['precio_venta_libra'] = $precio;
            $estado['paso'] = 'stock';
            Cache::put($clave, $estado, now()->addMinutes(30));

            $this->enviarMensaje(
                $chat_id,
                "⚖️ ¿Cuántas *libras iniciales* tienes en vitrina de *{$estado['nombre']}*?\nEscribe el peso o pulsa *0 lb* si entrará luego por despiece:",
                [
                    'keyboard' => [
                        ['0 lb (Entra por despiece)'],
                        ['❌ Cancelar'],
                    ],
                    'resize_keyboard' => true,
                ]
            );

            return;
        }

        if ($estado['paso'] === 'stock') {
            $stock = str_starts_with($texto, '0 lb')
                ? 0.00
                : round((float) str_replace(',', '.', $texto), 2);

            if ($stock < 0 || (! str_starts_with($texto, '0 lb') && ! is_numeric(str_replace(',', '.', trim($texto))))) {
                $this->enviarMensaje(
                    $chat_id,
                    '⚠️ Dato inválido. Escribe un número (ej. `10` o `0`) o toca el botón inferior:',
                    [
                        'keyboard' => [
                            ['0 lb (Entra por despiece)'],
                            ['❌ Cancelar'],
                        ],
                        'resize_keyboard' => true,
                    ]
                );

                return;
            }

            $producto = Producto::create([
                'nombre'              => $estado['nombre'],
                'precio_venta_libra'  => $estado['precio_venta_libra'],
                'costo_actual_libra'  => 0.00,
                'stock_libras'        => $stock,
                'stock_minimo_libras' => 5.00,
                'activo'              => true,
            ]);

            Cache::forget($clave);

            $this->enviarMenuPrincipal(
                $chat_id,
                "✅ *Corte agregado al catálogo*\n" .
                "Producto: *{$producto->nombre}*\n" .
                "Precio venta: *\${$producto->precio_venta_libra}/lb*\n" .
                "Stock en vitrina: *{$producto->stock_libras} lb*"
            );
        }
    }

    // =========================================================================
    // CONSULTA: QUIÉNES DEBEN (CARTERA DE FIADOS)
    // =========================================================================
    private function enviarListaDeudores(string $chat_id): void
    {
        $fiados = Venta::pendientesCobro()
            ->orderBy('cliente')
            ->orderBy('created_at')
            ->get(['id', 'cliente', 'monto_total', 'saldo_pendiente', 'created_at']);

        if ($fiados->isEmpty()) {
            $this->enviarMenuPrincipal($chat_id, '🎉 ¡No hay clientes con saldo pendiente! Todos están al día.');

            return;
        }

        $total_cartera = number_format((float) $fiados->sum('saldo_pendiente'), 2, '.', '');

        $agrupado = $fiados->groupBy(fn ($v) => mb_strtolower(trim($v->cliente)))
            ->map(function ($ventas) {
                $nombre = $ventas->first()->cliente;
                $deuda_cliente = number_format((float) $ventas->sum('saldo_pendiente'), 2, '.', '');
                $tickets = $ventas->map(fn ($v) => "   └ Ticket #{$v->id} ({$v->created_at->format('d/m')}): debe *\${$v->saldo_pendiente}*")
                    ->implode("\n");

                return "👤 *{$nombre}* — Total: *\${$deuda_cliente}*\n{$tickets}";
            })
            ->implode("\n\n");

        $this->enviarMenuPrincipal(
            $chat_id,
            "📒 *Clientes con saldo pendiente*\n\n{$agrupado}\n\n💰 *Cartera total por cobrar: \${$total_cartera}*"
        );
    }

    // =========================================================================
    // REPORTES RÁPIDOS Y UTILIDADES HTTP
    // =========================================================================
    private function enviarCierreDia(string $chat_id): void
    {
        $r = $this->venta_service->obtenerResumenDia();

        $texto = "📊 *Cierre del Día ({$r['fecha']})*\n\n" .
            "🧾 Tickets emitidos: *{$r['total_tickets']}*\n" .
            "💵 Efectivo real en caja: *\${$r['efectivo_real_caja']}*\n" .
            "   _(Ventas: \${$r['contado_efectivo']} + Abonos: \${$r['abonos_efectivo']})_\n" .
            "🏦 Transferencias reales: *\${$r['transferencia_real']}*\n" .
            "📒 Fiado hoy: *\${$r['fiado_hoy']}*\n" .
            "📈 Ganancia neta hoy: *\${$r['ganancia_total']}*\n\n" .
            "🗂 Cartera total por cobrar: *\${$r['cartera_por_cobrar']}*";

        $this->enviarMenuPrincipal($chat_id, $texto);
    }

    private function enviarStockActual(string $chat_id): void
    {
        $productos = Producto::activos()
            ->orderBy('nombre')
            ->get(['nombre', 'stock_libras', 'stock_minimo_libras', 'precio_venta_libra']);

        $bruto_camara = Compra::conSaldoBruto()->sum('peso_disponible_bruto_libras');

        $lineas = $productos->map(function ($p) {
            $alerta = (float) $p->stock_libras <= (float) $p->stock_minimo_libras ? '🔴' : '🟢';

            return "{$alerta} *{$p->nombre}:* {$p->stock_libras} lb (\${$p->precio_venta_libra}/lb)";
        })->implode("\n");

        $this->enviarMenuPrincipal(
            $chat_id,
            "🧊 *En cámara sin picar:* {$bruto_camara} lb brutas\n\n🥩 *Stock en vitrina:*\n{$lineas}"
        );
    }

    private function enviarMenuPrincipal(string $chat_id, string $texto): void
    {
        Cache::forget("tg_tuvo_flujo_{$chat_id}");

        $this->enviarMensaje($chat_id, $texto, [
            'keyboard' => [
                ['🥩 Registrar Venta', '🔪 Despiece Parcial'],
                ['📦 Nueva Compra', '📒 Cobrar Fiado'],
                ['👥 Ver Deudores', '➕ Nuevo Corte'],
                ['📦 Ver Stock', '📊 Cierre del Día'],
            ],
            'resize_keyboard' => true,
        ]);
    }

    private function tecladoCancelar(): array
    {
        return [
            'keyboard'        => [['❌ Cancelar']],
            'resize_keyboard' => true,
        ];
    }

    private function enviarMensaje(string $chat_id, string $texto, ?array $reply_markup = null): void
    {
        $token = config('services.telegram_bot.token');
        if (empty($token)) {
            return;
        }

        $payload = [
            'chat_id'    => $chat_id,
            'text'       => $texto,
            'parse_mode' => 'Markdown',
        ];

        if ($reply_markup) {
            $payload['reply_markup'] = json_encode($reply_markup);
        }

        $respuesta = Http::post("https://api.telegram.org/bot{$token}/sendMessage", $payload);

        if ($respuesta->failed()) {
            unset($payload['parse_mode']);
            Http::post("https://api.telegram.org/bot{$token}/sendMessage", $payload);
        }
    }
}
