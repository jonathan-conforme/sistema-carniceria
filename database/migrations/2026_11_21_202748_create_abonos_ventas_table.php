<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('abonos_ventas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venta_id')->constrained('ventas')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('restrict');
            $table->decimal('monto_abonado', 10, 2);
            $table->enum('metodo_pago', ['efectivo', 'transferencia'])->default('efectivo');
            $table->string('observacion')->nullable(); // Ej: "Abono en efectivo en local"
            $table->timestamps();

            // Índice para sumar rápido en el cierre de caja diario los fiados cobrados hoy
            $table->index(['created_at', 'metodo_pago'], 'idx_abonos_fecha_pago');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('abonos_ventas');
    }
};
