<?php

namespace App\Http\Controllers;

use App\Http\Requests\GuardarCompraRequest;
use App\Http\Requests\GuardarDespieceRequest;
use App\Http\Requests\RegistrarMermaPiezaRequest;
use App\Models\Compra;
use App\Models\Producto;
use App\Services\InventarioService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class InventarioController extends Controller
{
    public function __construct(
        private readonly InventarioService $inventario_service,
    ) {}

    public function index(): Response
    {
        $productos = Producto::orderByDesc('activo')
            ->orderBy('nombre')
            ->get([
                'id',
                'nombre',
                'precio_venta_libra',
                'costo_actual_libra',
                'stock_libras',
                'stock_minimo_libras',
                'activo',
            ]);

        $compras_camara = Compra::orderByDesc('fecha_compra')
            ->orderByDesc('id')
            ->limit(20)
            ->get([
                'id',
                'descripcion',
                'peso_inicial_libras',
                'peso_disponible_bruto_libras',
                'costo_total',
                'costo_base_libra',
                'fecha_compra',
            ]);

        return Inertia::render('Inventario/Index', [
            'productos'          => $productos,
            'comprasCamara'      => $compras_camara,
            'despiecesRecientes' => $this->obtenerDespiecesRecientes(),
        ]);
    }

    public function guardarProducto(Request $request): RedirectResponse
    {
        $datos = $request->validate([
            'nombre'              => ['required', 'string', 'min:2', 'max:100', 'unique:productos,nombre'],
            'precio_venta_libra'  => ['required', 'numeric', 'min:0.01'],
            'stock_libras'        => ['required', 'numeric', 'min:0'],
            'stock_minimo_libras' => ['required', 'numeric', 'min:0'],
        ]);

        Producto::create([
            'nombre'              => trim($datos['nombre']),
            'precio_venta_libra'  => $datos['precio_venta_libra'],
            'costo_actual_libra'  => 0.00,
            'stock_libras'        => $datos['stock_libras'],
            'stock_minimo_libras' => $datos['stock_minimo_libras'],
            'activo'              => true,
        ]);

        return back()->with('success', "Corte {$datos['nombre']} agregado al catálogo.");
    }

    public function actualizarProducto(Request $request, Producto $producto): RedirectResponse
    {
        $datos = $request->validate([
            'nombre'              => ['required', 'string', 'min:2', 'max:100', "unique:productos,nombre,{$producto->id}"],
            'precio_venta_libra'  => ['required', 'numeric', 'min:0.01'],
            'stock_minimo_libras' => ['required', 'numeric', 'min:0'],
            'activo'              => ['required', 'boolean'],
        ]);

        $producto->update([
            'nombre'              => trim($datos['nombre']),
            'precio_venta_libra'  => $datos['precio_venta_libra'],
            'stock_minimo_libras' => $datos['stock_minimo_libras'],
            'activo'              => $datos['activo'],
        ]);

        return back()->with('success', "Corte {$producto->nombre} actualizado.");
    }

    public function guardarCompra(GuardarCompraRequest $request): RedirectResponse
    {
        $this->inventario_service->registrarCompra($request->validated(), $request->user()->id);

        return back()->with('success', 'Compra ingresada a cámara.');
    }

    public function guardarDespiece(GuardarDespieceRequest $request): RedirectResponse
    {
        $this->inventario_service->registrarDespiece($request->validated(), $request->user()->id);

        return back()->with('success', 'Despiece parcial registrado y costos actualizados.');
    }

    public function registrarMermaPieza(RegistrarMermaPiezaRequest $request): RedirectResponse
    {
        $this->inventario_service->registrarMermaPieza($request->validated(), $request->user()->id);

        return back()->with('success', 'Merma de pieza descontada del inventario.');
    }

    private function obtenerDespiecesRecientes(): Collection|array
    {
        $tablas = collect(Schema::getTables())->pluck('name');

        $tabla = $tablas->first(fn (string $t) => str_contains($t, 'despiece') && ! str_contains($t, 'detalle'))
            ?? $tablas->first(fn (string $t) => str_contains($t, 'despiece'));

        if (! $tabla) {
            return [];
        }

        $columnas = Schema::getColumnListing($tabla);

        $col_bruto = collect($columnas)->first(fn ($c) => str_contains($c, 'bruto'));
        $col_util  = collect($columnas)->first(fn ($c) => str_contains($c, 'util') || str_contains($c, 'limpio') || str_contains($c, 'neto'));
        $col_merma = collect($columnas)->first(fn ($c) => str_contains($c, 'merma'));
        $col_costo = collect($columnas)->first(fn ($c) => str_contains($c, 'costo'));
        $col_pieza = collect($columnas)->first(fn ($c) => str_contains($c, 'pieza') || str_contains($c, 'origen') || str_contains($c, 'descripcion'));

        $query = DB::table($tabla)->orderByDesc("{$tabla}.id")->limit(15);

        if (in_array('compra_id', $columnas, true)) {
            $query->leftJoin('compras', 'compras.id', '=', "{$tabla}.compra_id")
                ->select("{$tabla}.*", 'compras.descripcion as compra_descripcion');
        } else {
            $query->select("{$tabla}.*");
        }

        return $query->get()->map(fn ($row) => [
            'id'                        => $row->id,
            'compra_descripcion'        => $row->compra_descripcion ?? ('Compra #' . ($row->compra_id ?? $row->id)),
            'pieza_origen'              => $col_pieza ? $row->{$col_pieza} : 'general',
            'peso_bruto_usado_libras'   => $col_bruto ? $row->{$col_bruto} : 0,
            'peso_util_obtenido_libras' => $col_util ? $row->{$col_util} : 0,
            'merma_libras'              => $col_merma ? $row->{$col_merma} : 0,
            'costo_real_libra_sesion'   => $col_costo ? $row->{$col_costo} : 0,
            'created_at'                => $row->created_at ?? '',
        ]);
    }
}
