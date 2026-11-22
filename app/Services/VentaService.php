<?php

namespace App\Services;

use App\Models\AbonoVenta;
use App\Models\DetalleVenta;
use App\Models\MovimientoInventario;
use App\Models\Producto;
use App\Models\Venta;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class VentaService
{
    public function registrarVenta(array $datos, int $user_id): Venta
    {
        return DB::transaction(function () use ($datos, $user_id) {
            $detalles_input = $datos['detalles'];
            $productos_ids = collect($detalles_input)->pluck('producto_id')->sort()->values();

            $productos = Producto::whereIn('id', $productos_ids)
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            $monto_total = 0;
            $costo_total = 0;
            $lineas_preparadas = [];

            foreach ($detalles_input as $item) {
                $producto = $productos->get($item['producto_id']);
                if (!$producto) {
                    throw new RuntimeException('Corte no encontrado.');
                }

                $precio_lista = (float) $producto->precio_venta_libra;
                $costo_lb = (float) $producto->costo_actual_libra;

                $tiene_peso = isset($item['peso_libras']) && $item['peso_libras'] !== null && $item['peso_libras'] !== '';
                $tiene_monto = isset($item['monto_cobrado']) && $item['monto_cobrado'] !== null && $item['monto_cobrado'] !== '';

                if ($tiene_peso && $tiene_monto) {
                    // Caso 3: Romana real (ej. 2.70 lb) + precio pactado/redondeado (ej. $3.00)
                    $peso = round((float) $item['peso_libras'], 2);
                    $subtotal = round((float) $item['monto_cobrado'], 2);
                    $precio_efectivo = $peso > 0 ? round($subtotal / $peso, 4) : $precio_lista;
                } elseif ($tiene_monto) {
                    // Caso 2: Venta rápida por dólares (ej. $3.00) -> deduce libras automáticamente
                    $subtotal = round((float) $item['monto_cobrado'], 2);
                    $peso = max(0.01, round($subtotal / max(0.01, $precio_lista), 2));
                    $precio_efectivo = $precio_lista;
                } else {
                    // Caso 1: Venta por libras de romana (ej. 2.70 lb)
                    $peso = round((float) $item['peso_libras'], 2);
                    $subtotal = round($peso * $precio_lista, 2);
                    $precio_efectivo = $precio_lista;
                }

                if ($peso > (float) $producto->stock_libras) {
                    throw new RuntimeException("Stock insuficiente de {$producto->nombre} (Disp: {$producto->stock_libras} lb).");
                }

                $costo_linea = round($peso * $costo_lb, 2);
                $ganancia_linea = round($subtotal - $costo_linea, 2);

                $monto_total += $subtotal;
                $costo_total += $costo_linea;

                $lineas_preparadas[] = [
                    'producto'              => $producto,
                    'peso_libras'           => $peso,
                    'precio_unitario_libra' => $precio_efectivo,
                    'costo_unitario_libra'  => $costo_lb,
                    'subtotal'              => $subtotal,
                    'ganancia'              => $ganancia_linea,
                ];
            }

            $monto_total = round($monto_total, 2);
            $costo_total = round($costo_total, 2);
            $ganancia_total = round($monto_total - $costo_total, 2);
            $es_fiado = $datos['metodo_pago'] === 'fiado';

            $venta = Venta::create([
                'user_id'          => $user_id,
                'cliente'          => $datos['cliente'] ?: 'Consumidor Final',
                'telefono_cliente' => $datos['telefono_cliente'] ?? null,
                'monto_total'      => $monto_total,
                'costo_total'      => $costo_total,
                'ganancia_total'   => $ganancia_total,
                'saldo_pendiente'  => $es_fiado ? $monto_total : 0.00,
                'metodo_pago'      => $datos['metodo_pago'],
                'estado_pago'      => $es_fiado ? 'pendiente' : 'pagado',
                'origen'           => $datos['origen'] ?? 'web',
            ]);

            foreach ($lineas_preparadas as $linea) {
                /** @var Producto $producto */
                $producto = $linea['producto'];
                $stock_anterior = (float) $producto->stock_libras;
                $stock_nuevo = round($stock_anterior - $linea['peso_libras'], 2);

                DetalleVenta::create([
                    'venta_id'              => $venta->id,
                    'producto_id'           => $producto->id,
                    'peso_libras'           => $linea['peso_libras'],
                    'precio_unitario_libra' => $linea['precio_unitario_libra'],
                    'costo_unitario_libra'  => $linea['costo_unitario_libra'],
                    'subtotal'              => $linea['subtotal'],
                    'ganancia'              => $linea['ganancia'],
                ]);

                $producto->update(['stock_libras' => $stock_nuevo]);

                MovimientoInventario::create([
                    'producto_id'           => $producto->id,
                    'user_id'               => $user_id,
                    'tipo'                  => 'venta',
                    'peso_libras'           => $linea['peso_libras'],
                    'stock_anterior_libras' => $stock_anterior,
                    'stock_nuevo_libras'    => $stock_nuevo,
                    'observacion'           => "Venta #{$venta->id} ({$venta->metodo_pago})",
                ]);
            }

            return $venta->load('detalles.producto');
        });
    }

    public function registrarAbono(array $datos, int $user_id): AbonoVenta
    {
        return DB::transaction(function () use ($datos, $user_id) {
            $venta = Venta::where('id', $datos['venta_id'])
                ->lockForUpdate()
                ->firstOrFail();

            $monto = round((float) $datos['monto_abonado'], 2);

            if ($monto > (float) $venta->saldo_pendiente) {
                throw new RuntimeException("El abono supera el saldo pendiente (\${$venta->saldo_pendiente}).");
            }

            $abono = AbonoVenta::create([
                'venta_id'      => $venta->id,
                'user_id'       => $user_id,
                'monto_abonado' => $monto,
                'metodo_pago'   => $datos['metodo_pago'],
                'observacion'   => $datos['observacion'] ?? null,
            ]);

            $nuevo_saldo = round((float) $venta->saldo_pendiente - $monto, 2);

            $venta->update([
                'saldo_pendiente' => max(0, $nuevo_saldo),
                'estado_pago'     => $nuevo_saldo <= 0 ? 'pagado' : 'parcial',
            ]);

            return $abono->load('venta');
        });
    }

    public function obtenerResumenDia(?Carbon $fecha = null): array
    {
        $dia = $fecha ?? now();
        $inicio = $dia->copy()->startOfDay();
        $fin = $dia->copy()->endOfDay();

        $ventas = Venta::whereBetween('created_at', [$inicio, $fin])
            ->selectRaw("
                COUNT(*) as total_tickets,
                COALESCE(SUM(monto_total), 0) as vendido_total,
                COALESCE(SUM(ganancia_total), 0) as ganancia_total,
                COALESCE(SUM(CASE WHEN metodo_pago = 'efectivo' THEN monto_total ELSE 0 END), 0) as contado_efectivo,
                COALESCE(SUM(CASE WHEN metodo_pago = 'transferencia' THEN monto_total ELSE 0 END), 0) as contado_transferencia,
                COALESCE(SUM(CASE WHEN metodo_pago = 'fiado' THEN monto_total ELSE 0 END), 0) as fiado_hoy
            ")
            ->first();

        $abonos = AbonoVenta::whereBetween('created_at', [$inicio, $fin])
            ->selectRaw("
                COALESCE(SUM(CASE WHEN metodo_pago = 'efectivo' THEN monto_abonado ELSE 0 END), 0) as abonos_efectivo,
                COALESCE(SUM(CASE WHEN metodo_pago = 'transferencia' THEN monto_abonado ELSE 0 END), 0) as abonos_transferencia
            ")
            ->first();

        $cartera_pendiente = Venta::whereIn('estado_pago', ['pendiente', 'parcial'])
            ->sum('saldo_pendiente');

        $efectivo_caja = round((float) $ventas->contado_efectivo + (float) $abonos->abonos_efectivo, 2);
        $transferencia_caja = round((float) $ventas->contado_transferencia + (float) $abonos->abonos_transferencia, 2);

        return [
            'fecha'                 => $dia->toDateString(),
            'total_tickets'         => (int) $ventas->total_tickets,
            'vendido_total'         => round((float) $ventas->vendido_total, 2),
            'ganancia_total'        => round((float) $ventas->ganancia_total, 2),
            'contado_efectivo'      => round((float) $ventas->contado_efectivo, 2),
            'contado_transferencia' => round((float) $ventas->contado_transferencia, 2),
            'fiado_hoy'             => round((float) $ventas->fiado_hoy, 2),
            'abonos_efectivo'       => round((float) $abonos->abonos_efectivo, 2),
            'abonos_transferencia'  => round((float) $abonos->abonos_transferencia, 2),
            'efectivo_real_caja'    => $efectivo_caja,
            'transferencia_real'    => $transferencia_caja,
            'cartera_por_cobrar'    => round((float) $cartera_pendiente, 2),
        ];
    }
}
