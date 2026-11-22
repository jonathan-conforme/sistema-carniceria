<?php

namespace App\Services;

use App\Models\Compra;
use App\Models\DetalleDespiece;
use App\Models\MovimientoInventario;
use App\Models\Producto;
use App\Models\SesionDespiece;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class InventarioService
{
    public function registrarCompra(array $datos, int $user_id): Compra
    {
        return DB::transaction(function () use ($datos, $user_id) {$peso = (float) $datos['peso_inicial_libras'];$costo_total = (float) $datos['costo_total'];$costo_base = round($costo_total / $peso, 4);

            return Compra::create([
                'user_id'                      => $user_id,
                'proveedor'                    => $datos['proveedor'] ?? null,
                'descripcion'                  => $datos['descripcion'],
                'peso_inicial_libras'          => $peso,
                'peso_disponible_bruto_libras' => $peso,
                'costo_total'                  => $costo_total,
                'costo_base_libra'             => $costo_base,
                'merma_acumulada_libras'        => 0,
                'estado'                       => 'con_saldo_bruto',
                'fecha_compra'                 => $datos['fecha_compra'] ?? now()->toDateString(),
            ]);
        });
    }

    public function registrarDespiece(array $datos, int $user_id): SesionDespiece
    {
        return DB::transaction(function () use ($datos,$user_id) {
            $compra = Compra::where('id',$datos['compra_id'])
                ->lockForUpdate()
                ->firstOrFail();

            $peso_bruto = round((float)$datos['peso_bruto_usado_libras'], 2);

            if ($peso_bruto > (float)$compra->peso_disponible_bruto_libras) {
                throw new RuntimeException('Saldo bruto insuficiente en la compra seleccionada.');
            }

            $peso_util = round(
                collect($datos['detalles'])->sum(fn ($item) => (float)$item['libras_obtenidas']),
                2
            );

            $merma = round($peso_bruto - $peso_util, 2);$costo_bruto_usado = $peso_bruto * (float)$compra->costo_base_libra;
            $costo_real_libra =$peso_util > 0 ? round($costo_bruto_usado / $peso_util, 4) : 0;

            $nuevo_saldo_bruto = round((float) $compra->peso_disponible_bruto_libras -$peso_bruto, 2);

            $compra->update([
                'peso_disponible_bruto_libras' => max(0, $nuevo_saldo_bruto),
                'merma_acumulada_libras'     => round((float) $compra->merma_acumulada_libras + $merma, 2), 'estado'                       =>$nuevo_saldo_bruto <= 0.01 ? 'agotado' : 'con_saldo_bruto',
            ]);

            $sesion = SesionDespiece::create([
                'compra_id'                 => $compra->id,
                'user_id'                   => $user_id,
                'pieza_origen'              => $datos['pieza_origen'],
                'observacion'               => $datos['observacion'] ?? null,
                'peso_bruto_usado_libras'   => $peso_bruto,
                'peso_util_obtenido_libras' => $peso_util,
                'merma_libras'              => $merma,
                'costo_real_libra_sesion'   => $costo_real_libra,
            ]);

            $productos_ids = collect($datos['detalles'])->pluck('producto_id')->sort()->values();
            $productos = Producto::whereIn('id',$productos_ids)
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            foreach ($datos['detalles'] as $item) {$producto = $productos->get($item['producto_id']);
                $libras_obtenidas = round((float)$item['libras_obtenidas'], 2);

                $stock_anterior = (float)$producto->stock_libras;
                $costo_anterior = (float)$producto->costo_actual_libra;
                $stock_nuevo = round($stock_anterior +$libras_obtenidas, 2);

                // Costo promedio ponderado entre el stock existente y el nuevo despiece
                $costo_ponderado =$stock_nuevo > 0
                    ? round((($stock_anterior * $costo_anterior) + ($libras_obtenidas * $costo_real_libra)) / $stock_nuevo, 4) :$costo_real_libra;

                DetalleDespiece::create([
                    'sesion_despiece_id'   => $sesion->id,
                    'producto_id'          => $producto->id,
                    'libras_obtenidas'     => $libras_obtenidas,
                    'costo_asignado_libra' => $costo_real_libra,
                ]);

                $producto->update([
                    'stock_libras'       => $stock_nuevo,
                    'costo_actual_libra' => $costo_ponderado,
                ]);

                MovimientoInventario::create([
                    'producto_id'           => $producto->id,
                    'user_id'               => $user_id,
                    'tipo'                  => 'entrada_despiece',
                    'peso_libras'           => $libras_obtenidas,
                    'stock_anterior_libras' => $stock_anterior,
                    'stock_nuevo_libras'    => $stock_nuevo,
                    'observacion'           => "Despiece #{$sesion->id} ({$datos['pieza_origen']})",
                ]);
            }

            return $sesion->load('detalles.producto');
        });
    }

    public function registrarMermaPieza(array $datos, int$user_id): MovimientoInventario
    {
        return DB::transaction(function () use ($datos,$user_id) {
            $producto = Producto::where('id',$datos['producto_id'])
                ->lockForUpdate()
                ->firstOrFail();

            $libras = round((float)$datos['peso_libras'], 2);
            $stock_anterior = (float)$producto->stock_libras;

            if ($libras >$stock_anterior) {
                throw new RuntimeException("Stock insuficiente en {$producto->nombre}.");
            }

            $stock_nuevo = round($stock_anterior -$libras, 2);

            $producto->update(['stock_libras' =>$stock_nuevo]);

            return MovimientoInventario::create([
                'producto_id'           => $producto->id,
                'user_id'               => $user_id,
                'tipo'                  => 'merma_pieza',
                'peso_libras'           => $libras,
                'stock_anterior_libras' => $stock_anterior,
                'stock_nuevo_libras'    => $stock_nuevo,
                'observacion'           => $datos['observacion'],
            ]);
        });
    }
}
