<?php

namespace App\Http\Controllers;

use App\Services\ReporteService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReporteController extends Controller
{
    public function __construct(
        private readonly ReporteService $reporte_service,
    ) {}

    public function index(Request $request): Response
    {
        $filtros = $this->reporte_service->resolverFiltros($request->all());
        $datos   = $this->reporte_service->generarReporte($filtros);

        return Inertia::render('Reportes/Index', [
            'filtros' => $filtros,
            ...$datos,
        ]);
    }

    public function exportarCsv(Request $request): StreamedResponse
    {
        $filtros = $this->reporte_service->resolverFiltros($request->all());
        $datos   = $this->reporte_service->generarReporte($filtros);

        $nombre_archivo = "reporte_carniceria_{$filtros['fecha_inicio']}_a_{$filtros['fecha_fin']}.csv";

        return response()->streamDownload(function () use ($datos, $filtros) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");

            fputcsv($out, ['REPORTE DE VENTAS Y CAJA', "Desde: {$filtros['fecha_inicio']}", "Hasta: {$filtros['fecha_fin']}"]);
            fputcsv($out, []);
            fputcsv($out, ['RESUMEN DE CAJA']);
            fputcsv($out, ['Total Facturado', 'Ingreso Real Caja', 'Efectivo Total', 'Transferencia Total', 'Fiado Pendiente', 'Ganancia Neta']);
            fputcsv($out, [
                number_format($datos['resumen']['total_facturado'], 2, '.', ''),
                number_format($datos['resumen']['ingreso_real_caja'], 2, '.', ''),
                number_format($datos['resumen']['efectivo_total'], 2, '.', ''),
                number_format($datos['resumen']['transferencia_total'], 2, '.', ''),
                number_format($datos['resumen']['fiado_pendiente'], 2, '.', ''),
                number_format($datos['resumen']['ganancia_neta'], 2, '.', ''),
            ]);

            fputcsv($out, []);
            fputcsv($out, ['VENTAS POR CORTE']);
            fputcsv($out, ['Corte', 'Libras Vendidas', 'Total Vendido ($)', 'Ganancia ($)']);
            foreach ($datos['ventasPorCorte'] as $corte) {
                fputcsv($out, [
                    $corte['nombre'],
                    number_format($corte['libras'], 2, '.', ''),
                    number_format($corte['total'], 2, '.', ''),
                    number_format($corte['ganancia'], 2, '.', ''),
                ]);
            }

            fputcsv($out, []);
            fputcsv($out, ['DETALLE DE TICKETS']);
            fputcsv($out, ['Ticket #', 'Fecha', 'Cliente', 'Canal', 'Metodo Pago', 'Total ($)', 'Saldo Pendiente ($)', 'Ganancia ($)']);
            foreach ($datos['tickets'] as $t) {
                fputcsv($out, [
                    $t['id'],
                    $t['fecha'],
                    $t['cliente'],
                    strtoupper($t['origen']),
                    strtoupper($t['metodo_pago']),
                    number_format($t['monto_total'], 2, '.', ''),
                    number_format($t['saldo_pendiente'], 2, '.', ''),
                    number_format($t['ganancia_total'], 2, '.', ''),
                ]);
            }

            fclose($out);
        }, $nombre_archivo, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }
}
