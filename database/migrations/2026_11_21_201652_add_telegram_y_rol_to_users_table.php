<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('telegram_chat_id')->nullable()->unique()->after('email');
            $table->enum('rol', ['administrador', 'vendedor', 'bodeguero'])
                  ->default('vendedor')
                  ->after('telegram_chat_id');

            $table->index(['rol', 'telegram_chat_id'], 'idx_users_rol_telegram');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('idx_users_rol_telegram');
            $table->dropColumn(['telegram_chat_id', 'rol']);
        });
    }
};
