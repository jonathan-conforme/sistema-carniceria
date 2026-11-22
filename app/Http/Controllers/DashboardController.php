<?php

namespace App\Http\Controllers;

use App\Models\Compra;
use App\Models\Producto;
use App\Models\Venta;
use App\Services\VentaService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        private readonly VentaService $venta_service
    ) {}

    public function index(): Response
    {
        $resumen_hoy = $this->venta_service->obtenerResumenDia();

        // 1. Serie últimos 7 días: Ventas Totales vs Ganancia Neta
        $dias_etiquetas = [];
        $serie_ventas = [];
        $serie_ganancias = [];

        for ($i = 6; $i >= 0; $i--) {
            $fecha = Carbon::today()->subDays($i);
            $dias_etiquetas[] = ucfirst($fecha->locale('es')->isoFormat('ddd D'));

            $totales_dia = Venta::whereDate('created_at', $fecha->toDateString())
                ->selectRaw('COALESCE(SUM(monto_total), 0) as total, COALESCE(SUM(ganancia_total), 0) as ganancia')
                ->first();

            $serie_ventas[] = round((float) ($totales_dia->total ?? 0), 2);
            $serie_ganancias[] = round((float) ($totales_dia->ganancia ?? 0), 2);
        }

        // 2. Distribución por Método de Pago (últimos 30 días)
        $inicio_mes = Carbon::today()->subDays(29);
        $pagos = Venta::whereDate('created_at', '>=', $inicio_mes->toDateString())
            ->selectRaw('metodo_pago, COALESCE(SUM(monto_total), 0) as total')
            ->groupBy('metodo_pago')
            ->pluck('total', 'metodo_pago');

        $distribucion_pagos = [
            'efectivo'      => round((float) ($pagos['efectivo'] ?? 0), 2),
            'transferencia' => round((float) ($pagos['transferencia'] ?? 0), 2),
            'fiado'         => round((float) ($pagos['fiado'] ?? 0), 2),
        ];

        // 3. Top 5 Cortes más vendidos en libras (últimos 30 días)
        $top_cortes = Schema::hasTable('venta_detalles')
            ? DB::table('venta_detalles')
                ->join('ventas', 'ventas.id', '=', 'venta_detalles.venta_id')
                ->join('productos', 'productos.id', '=', 'venta_detalles.producto_id')
                ->whereDate('ventas.created_at', '>=', $inicio_mes->toDateString())
                ->selectRaw('productos.nombre, ROUND(SUM(venta_detalles.peso_libras), 2) as libras, ROUND(SUM(venta_detalles.monto_cobrado), 2) as ingresos')
                ->groupBy('productos.id', 'productos.nombre')
                ->orderByDesc('libras')
                ->limit(5)
                ->get()
            : collect();

        // 4. Estado de Cámara, Vitrina y Rendimiento de Despiece
        $bruto_camara = round((float) Compra::conSaldoBruto()->sum('peso_disponible_bruto_libras'), 2);
        $limpio_vitrina = round((float) Producto::activos()->sum('stock_libras'), 2);

        $cortes_bajos = Producto::activos()
            ->whereColumn('stock_libras', '<=', 'stock_minimo_libras')
            ->orderBy('stock_libras')
            ->limit(5)
            ->get(['id', 'nombre', 'stock_libras', 'stock_minimo_libras']);

        $rendimiento_despiece = Schema::hasTable('despiece_sesiones')
            ? DB::table('despiece_sesiones')
                ->selectRaw('COALESCE(SUM(peso_bruto_usado_libras), 0) as bruto, COALESCE(SUM(peso_util_obtenido_libras), 0) as util, COALESCE(SUM(merma_libras), 0) as merma')
                ->first()
            : null;

        $bruto_usado = (float) ($rendimiento_despiece->bruto ?? 0);
        $util_obtenido = (float) ($rendimiento_despiece->util ?? 0);
        $porcentaje_aprovechamiento = $bruto_usado > 0
            ? round(($util_obtenido / $bruto_usado) * 100, 1)
            : 0;

        return Inertia::render('dashboard', [
            'resumenHoy' => $resumen_hoy,
            'graficaSemanal' => [
                'etiquetas' => $dias_etiquetas,
                'ventas'    => $serie_ventas,
                'ganancias' => $serie_ganancias,
            ],
            'distribucionPagos'         => $distribucion_pagos,
            'topCortes'                 => $top_cortes,
            'brutoCamara'               => $bruto_camara,
            'limpioVitrina'             => $limpio_vitrina,
            'cortesBajos'               => $cortes_bajos,
            'porcentajeAprovechamiento' => $porcentaje_aprovechamiento,
        ]);
    }
}
