<?php

namespace App\Services;

use App\Models\AbonoVenta;
use App\Models\Compra;
use App\Models\Venta;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ReporteService
{
    public function resolverFiltros(array $entrada = []): array
    {
        $hoy = Carbon::now()->toDateString();

        return [
            'fecha_inicio' => ! empty($entrada['fecha_inicio']) ? $entrada['fecha_inicio'] : Carbon::now()->startOfMonth()->toDateString(),
            'fecha_fin'    => ! empty($entrada['fecha_fin']) ? $entrada['fecha_fin'] : $hoy,
            'origen'       => ! empty($entrada['origen']) ? $entrada['origen'] : 'todos',
            'metodo_pago'  => ! empty($entrada['metodo_pago']) ? $entrada['metodo_pago'] : 'todos',
        ];
    }

    public function generarReporte(array $filtros): array
    {
        $inicio = Carbon::parse($filtros['fecha_inicio'])->startOfDay();
        $fin    = Carbon::parse($filtros['fecha_fin'])->endOfDay();

        $columnas_ventas = Schema::getColumnListing('ventas');
        $tiene_origen    = in_array('origen', $columnas_ventas, true);

        $query_ventas = Venta::whereBetween('created_at', [$inicio, $fin]);

        if ($tiene_origen && $filtros['origen'] !== 'todos') {
            $query_ventas->where('origen', $filtros['origen']);
        }

        if ($filtros['metodo_pago'] !== 'todos') {
            $query_ventas->where('metodo_pago', $filtros['metodo_pago']);
        }

        $ventas    = $query_ventas->orderByDesc('id')->get();
        $venta_ids = $ventas->pluck('id');

        // Abonos cobrados dentro del rango de fechas (liquidez recuperada)
        $tabla_abonos = class_exists(AbonoVenta::class)
            ? (new AbonoVenta())->getTable()
            : (Schema::hasTable('abono_ventas') ? 'abono_ventas' : 'abonos');

        $abonos = Schema::hasTable($tabla_abonos)
            ? DB::table($tabla_abonos)
                ->whereBetween('created_at', [$inicio, $fin])
                ->get()
            : collect();

        // Cálculos de Arqueo de Caja
        $ventas_efectivo      = (float) $ventas->where('metodo_pago', 'efectivo')->sum('monto_total');
        $ventas_transferencia = (float) $ventas->where('metodo_pago', 'transferencia')->sum('monto_total');
        $ventas_fiado_total   = (float) $ventas->where('metodo_pago', 'fiado')->sum('monto_total');
        $fiado_pendiente      = (float) $ventas->sum('saldo_pendiente');

        $abonos_efectivo      = (float) $abonos->where('metodo_pago', 'efectivo')->sum('monto_abonado');
        $abonos_transferencia = (float) $abonos->where('metodo_pago', 'transferencia')->sum('monto_abonado');

        $efectivo_total      = round($ventas_efectivo + $abonos_efectivo, 2);
        $transferencia_total = round($ventas_transferencia + $abonos_transferencia, 2);
        $ingreso_real_caja   = round($efectivo_total + $transferencia_total, 2);
        $total_facturado     = round((float) $ventas->sum('monto_total'), 2);
        $ganancia_neta       = round((float) $ventas->sum('ganancia_total'), 2);
        $margen_porcentaje   = $total_facturado > 0 ? round(($ganancia_neta / $total_facturado) * 100, 1) : 0;

        // Ventas agrupadas por corte
        $ventas_por_corte = [];
        if (Schema::hasTable('venta_detalles') && $venta_ids->isNotEmpty()) {
            $cols_detalle       = Schema::getColumnListing('venta_detalles');
            $tiene_ganancia_det = in_array('ganancia', $cols_detalle, true);

            $detalles = DB::table('venta_detalles')
                ->join('productos', 'productos.id', '=', 'venta_detalles.producto_id')
                ->whereIn('venta_detalles.venta_id', $venta_ids)
                ->select([
                    'productos.id as producto_id',
                    'productos.nombre',
                    'venta_detalles.peso_libras',
                    'venta_detalles.monto_cobrado',
                    $tiene_ganancia_det ? 'venta_detalles.ganancia' : DB::raw('0 as ganancia'),
                ])
                ->get();

            $ventas_por_corte = $detalles
                ->groupBy('producto_id')
                ->map(function ($items) use ($total_facturado) {
                    $total = (float) $items->sum('monto_cobrado');

                    return [
                        'nombre'        => $items->first()->nombre,
                        'libras'        => round((float) $items->sum('peso_libras'), 2),
                        'total'         => round($total, 2),
                        'ganancia'      => round((float) $items->sum('ganancia'), 2),
                        'participacion' => $total_facturado > 0 ? round(($total / $total_facturado) * 100, 1) : 0,
                    ];
                })
                ->sortByDesc('total')
                ->values()
                ->all();
        }

        // Estadísticas de Cámara y Merma en el período
        $compras_periodo = Schema::hasTable('compras')
            ? Compra::whereBetween('created_at', [$inicio, $fin])->get()
            : collect();

        $tablas         = collect(Schema::getTables())->pluck('name');
        $tabla_despiece = $tablas->first(fn (string $t) => str_contains($t, 'despiece') && ! str_contains($t, 'detalle'))
            ?? $tablas->first(fn (string $t) => str_contains($t, 'despiece'));

        $bruto_procesado = 0.0;
        $util_obtenido   = 0.0;
        $merma_total     = 0.0;
        $sesiones_count  = 0;

        if ($tabla_despiece) {
            $cols_d    = Schema::getColumnListing($tabla_despiece);
            $col_bruto = collect($cols_d)->first(fn ($c) => str_contains($c, 'bruto'));
            $col_util  = collect($cols_d)->first(fn ($c) => str_contains($c, 'util') || str_contains($c, 'limpio') || str_contains($c, 'neto'));
            $col_merma = collect($cols_d)->first(fn ($c) => str_contains($c, 'merma'));

            $despieces = DB::table($tabla_despiece)
                ->whereBetween('created_at', [$inicio, $fin])
                ->get();

            $sesiones_count  = $despieces->count();
            $bruto_procesado = $col_bruto ? round((float) $despieces->sum($col_bruto), 2) : 0;
            $util_obtenido   = $col_util ? round((float) $despieces->sum($col_util), 2) : 0;
            $merma_total     = $col_merma ? round((float) $despieces->sum($col_merma), 2) : 0;
        }

        $porcentaje_merma = $bruto_procesado > 0
            ? round(($merma_total / $bruto_procesado) * 100, 1)
            : 0;

        // Listado de tickets del período
        $tickets = $ventas->map(fn ($v) => [
            'id'              => $v->id,
            'cliente'         => $v->cliente ?: 'Consumidor Final',
            'metodo_pago'     => $v->metodo_pago,
            'monto_total'     => (float) $v->monto_total,
            'saldo_pendiente' => (float) $v->saldo_pendiente,
            'ganancia_total'  => (float) $v->ganancia_total,
            'origen'          => $tiene_origen ? ($v->origen ?? 'web') : 'web',
            'fecha'           => Carbon::parse($v->created_at)->format('d/m/Y H:i'),
        ])->values()->all();

        return [
            'resumen' => [
                'total_facturado'      => $total_facturado,
                'cantidad_tickets'     => $ventas->count(),
                'ingreso_real_caja'    => $ingreso_real_caja,
                'ventas_efectivo'      => round($ventas_efectivo, 2),
                'ventas_transferencia' => round($ventas_transferencia, 2),
                'abonos_efectivo'      => round($abonos_efectivo, 2),
                'abonos_transferencia' => round($abonos_transferencia, 2),
                'efectivo_total'       => $efectivo_total,
                'transferencia_total'  => $transferencia_total,
                'ventas_fiado_total'   => round($ventas_fiado_total, 2),
                'fiado_pendiente'      => round($fiado_pendiente, 2),
                'ganancia_neta'        => $ganancia_neta,
                'margen_porcentaje'    => $margen_porcentaje,
                'tickets_web'          => $ventas->filter(fn ($v) => ($v->origen ?? 'web') === 'web')->count(),
                'tickets_telegram'     => $ventas->filter(fn ($v) => ($v->origen ?? 'web') === 'telegram')->count(),
            ],
            'ventasPorCorte' => $ventas_por_corte,
            'mermaPeriodo'   => [
                'compras_count'    => $compras_periodo->count(),
                'inversion_camara' => round((float) $compras_periodo->sum('costo_total'), 2),
                'sesiones_count'   => $sesiones_count,
                'bruto_procesado'  => $bruto_procesado,
                'util_obtenido'    => $util_obtenido,
                'merma_total'      => $merma_total,
                'porcentaje_merma' => $porcentaje_merma,
            ],
            'tickets' => $tickets,
        ];
    }
}
