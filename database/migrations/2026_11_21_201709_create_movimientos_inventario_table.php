<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('movimientos_inventario', function (Blueprint $table) {
            $table->id();
            $table->foreignId('producto_id')->constrained('productos')->onDelete('restrict');
            $table->foreignId('user_id')->constrained('users')->onDelete('restrict');
            $table->enum('tipo', ['entrada_despiece', 'venta', 'merma_pieza', 'ajuste']);
            $table->decimal('peso_libras', 10, 2);
            $table->decimal('stock_anterior_libras', 10, 2);
            $table->decimal('stock_nuevo_libras', 10, 2);
            $table->string('observacion')->nullable();
            $table->timestamps();

            $table->index(['producto_id', 'created_at'], 'idx_kardex_producto_fecha');
            $table->index(['tipo', 'created_at'], 'idx_kardex_tipo_fecha');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('movimientos_inventario');
    }
};
