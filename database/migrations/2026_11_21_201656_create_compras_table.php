<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('compras', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('restrict');
            $table->string('proveedor')->nullable();
            $table->string('descripcion');
            $table->decimal('peso_inicial_libras', 10, 2);
            $table->decimal('peso_disponible_bruto_libras', 10, 2);
            $table->decimal('costo_total', 10, 2);
            $table->decimal('costo_base_libra', 10, 4);
            $table->decimal('merma_acumulada_libras', 10, 2)->default(0);
            $table->enum('estado', ['con_saldo_bruto', 'agotado'])->default('con_saldo_bruto');
            $table->date('fecha_compra');
            $table->timestamps();

            $table->index(['estado', 'fecha_compra'], 'idx_compras_saldo_fecha');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('compras');
    }
};
