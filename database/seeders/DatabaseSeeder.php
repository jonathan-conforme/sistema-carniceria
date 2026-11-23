<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $adminEmail      = config('app.admin.email');
        $adminPassword   = config('app.admin.password');
        $adminName       = config('app.admin.name') ?: 'Administrador';
        $adminTelegramId = config('app.admin.telegram_id') ?: null;

        if (empty($adminEmail) || empty($adminPassword)) {
            throw new RuntimeException('Faltan ADMIN_EMAIL o ADMIN_PASSWORD en las variables de entorno.');
        }

        DB::transaction(function () use ($adminEmail, $adminPassword, $adminName, $adminTelegramId) {
            $ahora = now();

            if (! DB::table('users')->where('email', $adminEmail)->exists()) {
                DB::table('users')->insert([
                    'name'              => $adminName,
                    'email'             => $adminEmail,
                    'email_verified_at' => $ahora,
                    'password'          => Hash::make($adminPassword),
                    'telegram_chat_id'  => $adminTelegramId,
                    'rol'               => 'administrador',
                    'created_at'        => $ahora,
                    'updated_at'        => $ahora,
                ]);
            }

            $cortes_iniciales = [
                ['nombre' => 'Chuleta',            'precio' => 2.70, 'minimo' => 15.00],
                ['nombre' => 'Costilla',           'precio' => 2.75, 'minimo' => 10.00],
                ['nombre' => 'Lomo fino',          'precio' => 3.00, 'minimo' => 8.00],
                ['nombre' => 'Carne para fritada', 'precio' => 2.50, 'minimo' => 12.00],
                ['nombre' => 'Grasa',              'precio' => 2.00, 'minimo' => 5.00],
                ['nombre' => 'Hueso carnudo',      'precio' => 2.00, 'minimo' => 8.00],
            ];

            foreach ($cortes_iniciales as $datos) {
                if (! DB::table('productos')->where('nombre', $datos['nombre'])->exists()) {
                    DB::table('productos')->insert([
                        'nombre'              => $datos['nombre'],
                        'precio_venta_libra'  => $datos['precio'],
                        'costo_actual_libra'  => 0.0000,
                        'stock_libras'        => 0.00,
                        'stock_minimo_libras' => $datos['minimo'],
                        'activo'              => true,
                        'created_at'          => $ahora,
                        'updated_at'          => $ahora,
                    ]);
                }
            }
        });
    }
}
