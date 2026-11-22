<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ventas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('restrict');
            $table->string('cliente')->nullable(); // Obligatorio cuando metodo_pago = 'fiado'
            $table->string('telefono_cliente', 20)->nullable(); // Opcional para recordatorios
            $table->decimal('monto_total', 10, 2);
            $table->decimal('costo_total', 10, 2);
            $table->decimal('ganancia_total', 10, 2);
            $table->decimal('saldo_pendiente', 10, 2)->default(0); // 0 si pagó al contado; = monto_total si es fiado
            $table->enum('metodo_pago', ['efectivo', 'transferencia', 'fiado'])->default('efectivo');
            $table->enum('estado_pago', ['pagado', 'parcial', 'pendiente'])->default('pagado');
            $table->enum('origen', ['telegram', 'web'])->default('telegram');
            $table->timestamps();

            // Índices compuestos para reportes livianos y cobranzas
            $table->index(['created_at', 'metodo_pago'], 'idx_ventas_fecha_pago');
            $table->index(['estado_pago', 'cliente'], 'idx_ventas_fiados_cliente');
            $table->index(['user_id', 'created_at'], 'idx_ventas_usuario_fecha');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ventas');
    }
};
