<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('detalles_despiece', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sesion_despiece_id')->constrained('sesiones_despiece')->onDelete('cascade');
            $table->foreignId('producto_id')->constrained('productos')->onDelete('restrict');
            $table->decimal('libras_obtenidas', 10, 2);
            $table->decimal('costo_asignado_libra', 10, 4);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('detalles_despiece');
    }
};
