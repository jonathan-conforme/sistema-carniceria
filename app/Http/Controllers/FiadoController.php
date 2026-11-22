<?php

namespace App\Http\Controllers;

use App\Models\Venta;
use App\Services\VentaService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class FiadoController extends Controller
{
    public function __construct(
        private readonly VentaService $venta_service
    ) {}

    public function index(): Response
    {
        $fiados_pendientes = Venta::pendientesCobro()
            ->orderBy('cliente')
            ->orderBy('created_at')
            ->get([
                'id',
                'cliente',
                'monto_total',
                'saldo_pendiente',
                'origen',
                'created_at',
            ]);

        $ventas_recientes = Venta::orderByDesc('id')
            ->limit(25)
            ->get([
                'id',
                'cliente',
                'metodo_pago',
                'monto_total',
                'saldo_pendiente',
                'ganancia_total',
                'origen',
                'created_at',
            ]);

        $abonos_recientes = Schema::hasTable('abonos')
            ? DB::table('abonos')
                ->join('ventas', 'ventas.id', '=', 'abonos.venta_id')
                ->select([
                    'abonos.id',
                    'abonos.venta_id',
                    'ventas.cliente',
                    'abonos.monto_abonado',
                    'abonos.metodo_pago',
                    'abonos.created_at',
                ])
                ->orderByDesc('abonos.id')
                ->limit(15)
                ->get()
            : [];

        return Inertia::render('Fiados/Index', [
            'fiadosPendientes' => $fiados_pendientes,
            'ventasRecientes'  => $ventas_recientes,
            'abonosRecientes'  => $abonos_recientes,
            'resumenHoy'       => $this->venta_service->obtenerResumenDia(),
        ]);
    }
}
