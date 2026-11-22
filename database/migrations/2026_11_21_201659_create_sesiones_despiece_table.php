<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sesiones_despiece', function (Blueprint $table) {
            $table->id();
            $table->foreignId('compra_id')->constrained('compras')->onDelete('restrict');
            $table->foreignId('user_id')->constrained('users')->onDelete('restrict');
            $table->enum('pieza_origen', ['pierna', 'brazo', 'lomo', 'costilla', 'mixto']);
            $table->string('observacion')->nullable();
            $table->decimal('peso_bruto_usado_libras', 10, 2);
            $table->decimal('peso_util_obtenido_libras', 10, 2);
            $table->decimal('merma_libras', 10, 2);
            $table->decimal('costo_real_libra_sesion', 10, 4);
            $table->timestamps();

            $table->index(['compra_id', 'created_at'], 'idx_sesiones_compra_fecha');
            $table->index(['pieza_origen', 'created_at'], 'idx_sesiones_pieza_fecha');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sesiones_despiece');
    }
};
