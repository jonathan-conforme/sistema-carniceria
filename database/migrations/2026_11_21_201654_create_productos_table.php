<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('productos', function (Blueprint $table) {
            $table->id();
            $table->string('nombre');
            $table->decimal('precio_venta_libra', 10, 2);
            $table->decimal('costo_actual_libra', 10, 4)->default(0);
            $table->decimal('stock_libras', 10, 2)->default(0);
            $table->decimal('stock_minimo_libras', 10, 2)->default(10);
            $table->boolean('activo')->default(true);
            $table->timestamps();

            $table->index(['activo', 'nombre'], 'idx_productos_activos');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('productos');
    }
};
