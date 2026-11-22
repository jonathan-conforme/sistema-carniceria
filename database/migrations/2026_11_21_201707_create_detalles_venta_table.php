<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('detalles_venta', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venta_id')->constrained('ventas')->onDelete('cascade');
            $table->foreignId('producto_id')->constrained('productos')->onDelete('restrict');
            $table->decimal('peso_libras', 10, 2);
            $table->decimal('precio_unitario_libra', 10, 2);
            $table->decimal('costo_unitario_libra', 10, 4);
            $table->decimal('subtotal', 10, 2);
            $table->decimal('ganancia', 10, 2);
            $table->timestamps();

            $table->index(['producto_id', 'created_at'], 'idx_detalles_venta_producto_fecha');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('detalles_venta');
    }
};
