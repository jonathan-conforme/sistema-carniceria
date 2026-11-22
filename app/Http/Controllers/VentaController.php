<?php

namespace App\Http\Controllers;

use App\Http\Requests\GuardarAbonoRequest;
use App\Http\Requests\GuardarVentaRequest;
use App\Services\VentaService;
use Illuminate\Http\RedirectResponse;
use RuntimeException;

class VentaController extends Controller
{
    public function __construct(
        private readonly VentaService $venta_service,
    ) {}

    public function store(GuardarVentaRequest $request): RedirectResponse
    {
        $datos = $request->validated();
        $datos['origen'] = 'web';

        $this->venta_service->registrarVenta($datos, $request->user()->id);

        return back()->with('success', 'Venta reregistrarAbonogistrada correctamente.');
    }

    public function registrarAbono(GuardarAbonoRequest $request): RedirectResponse
    {
        try {
            $this->venta_service->registrarAbono($request->validated(), $request->user()->id);

            return back()->with('success', 'Abono registrado correctamente.');
        } catch (RuntimeException $e) {
            return back()->withErrors(['monto_abonado' => $e->getMessage()]);
        }
    }
}
