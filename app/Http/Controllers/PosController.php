<?php

namespace App\Http\Controllers;

use App\Http\Requests\GuardarVentaRequest;
use App\Models\Producto;
use App\Models\Venta;
use App\Services\VentaService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class PosController extends Controller
{
    public function __construct(
        private readonly VentaService $venta_service
    ) {}

    public function index(): Response
    {
        $productos = Producto::activos()
            ->orderBy('nombre')
            ->get([
                'id',
                'nombre',
                'precio_venta_libra',
                'stock_libras',
                'stock_minimo_libras',
            ]);

        $clientes_frecuentes = Venta::whereNotNull('cliente')
            ->where('cliente', '!=', '')
            ->distinct()
            ->orderBy('cliente')
            ->pluck('cliente');

        return Inertia::render('Pos/Index', [
            'productos'           => $productos,
            'clientesFrecuentes'  => $clientes_frecuentes,
            'resumenHoy'          => $this->venta_service->obtenerResumenDia(),
        ]);
    }

    public function store(GuardarVentaRequest $request): RedirectResponse
    {
        $venta = $this->venta_service->registrarVenta(
            $request->validated(),
            (int) $request->user()->id
        );

        return back()->with('success', "Venta #{$venta->id} registrada por \${$venta->monto_total}");
    }
}
