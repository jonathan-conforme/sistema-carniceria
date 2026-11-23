<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\FiadoController;
use App\Http\Controllers\InventarioController;
use App\Http\Controllers\PosController;
use App\Http\Controllers\ReporteController;
use App\Http\Controllers\VentaController;
use App\Http\Controllers\UsuarioController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;


Route::middleware(['auth'])->group(function () {
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

    Route::get('/ventas', [FiadoController::class, 'index'])->name('ventas.index');
    Route::post('/ventas', [VentaController::class, 'store'])->name('ventas.store');
    Route::post('/ventas/abonos', [VentaController::class, 'registrarAbono'])->name('ventas.abonos.store');

    Route::get('/inventario', [InventarioController::class, 'index'])->name('inventario.index');
    Route::post('/inventario/productos', [InventarioController::class, 'guardarProducto'])->name('inventario.productos.store');
    Route::put('/inventario/productos/{producto}', [InventarioController::class, 'actualizarProducto'])->name('inventario.productos.update');
    Route::post('/inventario/compras', [InventarioController::class, 'guardarCompra'])->name('inventario.compras.store');
    Route::post('/inventario/despieces', [InventarioController::class, 'guardarDespiece'])->name('inventario.despieces.store');
    Route::post('/inventario/mermas', [InventarioController::class, 'registrarMermaPieza'])->name('inventario.mermas.store');
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/pos', [PosController::class, 'index'])->name('pos.index');
    Route::post('/pos/ventas', [PosController::class, 'store'])->name('pos.ventas.store');

    Route::get('/reportes', [ReporteController::class, 'index'])->name('reportes.index');
    Route::get('/reportes/exportar', [ReporteController::class, 'exportarCsv'])->name('reportes.exportar');

    Route::get('/usuarios', [UsuarioController::class, 'index'])->name('usuarios.index');
    Route::post('/usuarios', [UsuarioController::class, 'store'])->name('usuarios.store');
    Route::put('/usuarios/{usuario}', [UsuarioController::class, 'update'])->name('usuarios.update');
    Route::post('/usuarios/{usuario}/probar-telegram', [UsuarioController::class, 'probarTelegram'])->name('usuarios.probar-telegram');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
