<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $ahora = now();

            // 1. USUARIOS DE PRUEBA (Clave para ambos: "password")
            $admin_id = DB::table('users')->insertGetId([
                'name'              => 'Administrador Carnicería',
                'email'             => 'admin@carniceria.com',
                'email_verified_at' => $ahora,
                'password'          => Hash::make('password'),
                'telegram_chat_id'  => '100000001',
                'rol'               => 'administrador',
                'created_at'        => $ahora,
                'updated_at'        => $ahora,
            ]);

            $vendedor_id = DB::table('users')->insertGetId([
                'name'              => 'Carlos Vendedor',
                'email'             => 'vendedor@carniceria.com',
                'email_verified_at' => $ahora,
                'password'          => Hash::make('password'),
                'telegram_chat_id'  => '100000002',
                'rol'               => 'vendedor',
                'created_at'        => $ahora,
                'updated_at'        => $ahora,
            ]);

            // 2. CATÁLOGO DE CORTES CON TUS PRECIOS REALES
            $cortes_iniciales = [
                'chuleta'  => ['nombre' => 'Chuleta',            'precio' => 2.70, 'minimo' => 15.00],
                'costilla' => ['nombre' => 'Costilla',           'precio' => 2.75, 'minimo' => 10.00],
                'lomo'     => ['nombre' => 'Lomo fino',          'precio' => 3.00, 'minimo' => 8.00],
                'fritada'  => ['nombre' => 'Carne para fritada', 'precio' => 2.50, 'minimo' => 12.00],
                'grasa'    => ['nombre' => 'Grasa',              'precio' => 2.00, 'minimo' => 5.00],
                'hueso'    => ['nombre' => 'Hueso carnudo',      'precio' => 2.00, 'minimo' => 8.00],
            ];

            $productos_ids = [];
            $stock_actual = [];

            foreach ($cortes_iniciales as $clave => $datos) {
                $productos_ids[$clave] = DB::table('productos')->insertGetId([
                    'nombre'              => $datos['nombre'],
                    'precio_venta_libra'  => $datos['precio'],
                    'costo_actual_libra'  => 0.0000,
                    'stock_libras'        => 0.00,
                    'stock_minimo_libras' => $datos['minimo'],
                    'activo'              => true,
                    'created_at'          => $ahora,
                    'updated_at'          => $ahora,
                ]);
                $stock_actual[$clave] = 0.00;
            }

            // 3. COMPRA AL PROVEEDOR (104.85 lb por $196.49 -> $1.8740/lb base)
            $costo_base = 1.8740;
            $compra_id = DB::table('compras')->insertGetId([
                'user_id'                      => $admin_id,
                'proveedor'                    => 'Granja Porcina El Corral',
                'descripcion'                  => 'Medio chancho completo (pierna, brazo, lomo, costilla)',
                'peso_inicial_libras'          => 104.85,
                'peso_disponible_bruto_libras' => 54.85, // Quedan 54.85 lb enteras en cámara
                'costo_total'                  => 196.49,
                'costo_base_libra'             => $costo_base,
                'merma_acumulada_libras'     => 2.00,  // 1.20 lb + 0.80 lb de las 2 sesiones
                'estado'                       => 'con_saldo_bruto',
                'fecha_compra'                 => $ahora->toDateString(),
                'created_at'                   => $ahora->copy()->subHours(5),
                'updated_at'                   => $ahora->copy()->subHours(3),
            ]);

            // Función auxiliar para registrar movimientos en el Kardex
            $registrar_kardex = function (string $clave_prod, int $usuario, string $tipo, float $libras, string $obs, $fecha) use (&$stock_actual, $productos_ids) {
                $anterior = $stock_actual[$clave_prod];
                $nuevo = ($tipo === 'entrada_despiece' || $tipo === 'ajuste')
                    ? round($anterior + $libras, 2)
                    : round($anterior - $libras, 2);

                DB::table('movimientos_inventario')->insert([
                    'producto_id'           => $productos_ids[$clave_prod],
                    'user_id'               => $usuario,
                    'tipo'                  => $tipo,
                    'peso_libras'           => $libras,
                    'stock_anterior_libras' => $anterior,
                    'stock_nuevo_libras'    => $nuevo,
                    'observacion'           => $obs,
                    'created_at'            => $fecha,
                    'updated_at'            => $fecha,
                ]);

                $stock_actual[$clave_prod] = $nuevo;
            };

            // 4A. SESIÓN DE DESPIECE PARCIAL #1: Mitad de pierna y brazo (30.00 lb bruto -> 28.80 lb útil)
            $costo_real_sesion = 1.9521; // (30 * 1.8740) / 28.80
            $fecha_s1 = $ahora->copy()->subHours(4);

            $sesion_1_id = DB::table('sesiones_despiece')->insertGetId([
                'compra_id'                 => $compra_id,
                'user_id'                   => $admin_id,
                'pieza_origen'              => 'mixto',
                'observacion'               => 'Mitad de pierna y mitad de brazo para vitrina',
                'peso_bruto_usado_libras'   => 30.00,
                'peso_util_obtenido_libras' => 28.80,
                'merma_libras'              => 1.20,
                'costo_real_libra_sesion'   => $costo_real_sesion,
                'created_at'                => $fecha_s1,
                'updated_at'                => $fecha_s1,
            ]);

            $cortes_s1 = [
                'chuleta' => 20.50,
                'fritada' => 4.50,
                'grasa'   => 2.00,
                'hueso'   => 1.80,
            ];

            foreach ($cortes_s1 as $clave => $libras) {
                DB::table('detalles_despiece')->insert([
                    'sesion_despiece_id'  => $sesion_1_id,
                    'producto_id'         => $productos_ids[$clave],
                    'libras_obtenidas'    => $libras,
                    'costo_asignado_libra'=> $costo_real_sesion,
                    'created_at'          => $fecha_s1,
                    'updated_at'          => $fecha_s1,
                ]);
                $registrar_kardex($clave, $admin_id, 'entrada_despiece', $libras, 'Despiece parcial #1 (Pierna/Brazo)', $fecha_s1);
            }

            // 4B. SESIÓN DE DESPIECE PARCIAL #2: Mitad de lomo y costilla (20.00 lb bruto -> 19.20 lb útil)
            $fecha_s2 = $ahora->copy()->subHours(3);

            $sesion_2_id = DB::table('sesiones_despiece')->insertGetId([
                'compra_id'                 => $compra_id,
                'user_id'                   => $admin_id,
                'pieza_origen'              => 'lomo',
                'observacion'               => 'Mitad de lomo y media costilla',
                'peso_bruto_usado_libras'   => 20.00,
                'peso_util_obtenido_libras' => 19.20,
                'merma_libras'              => 0.80,
                'costo_real_libra_sesion'   => $costo_real_sesion,
                'created_at'                => $fecha_s2,
                'updated_at'                => $fecha_s2,
            ]);

            $cortes_s2 = [
                'costilla' => 11.20,
                'lomo'     => 6.50,
                'grasa'    => 1.50,
            ];

            foreach ($cortes_s2 as $clave => $libras) {
                DB::table('detalles_despiece')->insert([
                    'sesion_despiece_id'  => $sesion_2_id,
                    'producto_id'         => $productos_ids[$clave],
                    'libras_obtenidas'    => $libras,
                    'costo_asignado_libra'=> $costo_real_sesion,
                    'created_at'          => $fecha_s2,
                    'updated_at'          => $fecha_s2,
                ]);
                $registrar_kardex($clave, $admin_id, 'entrada_despiece', $libras, 'Despiece parcial #2 (Lomo/Costilla)', $fecha_s2);
            }

            // 5. MERMA EN MOSTRADOR (Limpieza al porcionar medio lomo fino: 0.30 lb)
            $registrar_kardex(
                'lomo',
                $vendedor_id,
                'merma_pieza',
                0.30,
                'Recorte de pellejo al porcionar medio lomo fino',
                $ahora->copy()->subHours(2)
            );

            // 6. VENTAS DE PRUEBA (Efectivo, Transferencia, Fiado Parcial y Fiado Pendiente)

            // Venta #1: Efectivo desde Telegram
            $f_v1 = $ahora->copy()->subMinutes(95);
            $v1_id = DB::table('ventas')->insertGetId([
                'user_id'         => $vendedor_id,
                'cliente'         => 'Consumidor Final',
                'monto_total'     => 13.60,
                'costo_total'     => 9.76,
                'ganancia_total'  => 3.84,
                'saldo_pendiente' => 0.00,
                'metodo_pago'     => 'efectivo',
                'estado_pago'     => 'pagado',
                'origen'          => 'telegram',
                'created_at'      => $f_v1,
                'updated_at'      => $f_v1,
            ]);
            DB::table('detalles_venta')->insert([
                [
                    'venta_id' => $v1_id, 'producto_id' => $productos_ids['chuleta'],
                    'peso_libras' => 3.00, 'precio_unitario_libra' => 2.70, 'costo_unitario_libra' => $costo_real_sesion,
                    'subtotal' => 8.10, 'ganancia' => 2.24, 'created_at' => $f_v1, 'updated_at' => $f_v1,
                ],
                [
                    'venta_id' => $v1_id, 'producto_id' => $productos_ids['costilla'],
                    'peso_libras' => 2.00, 'precio_unitario_libra' => 2.75, 'costo_unitario_libra' => $costo_real_sesion,
                    'subtotal' => 5.50, 'ganancia' => 1.60, 'created_at' => $f_v1, 'updated_at' => $f_v1,
                ],
            ]);
            $registrar_kardex('chuleta', $vendedor_id, 'venta', 3.00, "Venta #{$v1_id} (Efectivo)", $f_v1);
            $registrar_kardex('costilla', $vendedor_id, 'venta', 2.00, "Venta #{$v1_id} (Efectivo)", $f_v1);

            // Venta #2: Transferencia desde Web (Deja Carne para fritada en stock bajo para probar alertas)
            $f_v2 = $ahora->copy()->subMinutes(60);
            $v2_id = DB::table('ventas')->insertGetId([
                'user_id'         => $admin_id,
                'cliente'         => 'Comedor Doña Marta',
                'telefono_cliente'=> '0998887766',
                'monto_total'     => 13.00,
                'costo_total'     => 10.74,
                'ganancia_total'  => 2.26,
                'saldo_pendiente' => 0.00,
                'metodo_pago'     => 'transferencia',
                'estado_pago'     => 'pagado',
                'origen'          => 'web',
                'created_at'      => $f_v2,
                'updated_at'      => $f_v2,
            ]);
            DB::table('detalles_venta')->insert([
                [
                    'venta_id' => $v2_id, 'producto_id' => $productos_ids['fritada'],
                    'peso_libras' => 4.00, 'precio_unitario_libra' => 2.50, 'costo_unitario_libra' => $costo_real_sesion,
                    'subtotal' => 10.00, 'ganancia' => 2.19, 'created_at' => $f_v2, 'updated_at' => $f_v2,
                ],
                [
                    'venta_id' => $v2_id, 'producto_id' => $productos_ids['grasa'],
                    'peso_libras' => 1.50, 'precio_unitario_libra' => 2.00, 'costo_unitario_libra' => $costo_real_sesion,
                    'subtotal' => 3.00, 'ganancia' => 0.07, 'created_at' => $f_v2, 'updated_at' => $f_v2,
                ],
            ]);
            $registrar_kardex('fritada', $admin_id, 'venta', 4.00, "Venta #{$v2_id} (Transferencia)", $f_v2);
            $registrar_kardex('grasa', $admin_id, 'venta', 1.50, "Venta #{$v2_id} (Transferencia)", $f_v2);

            // Venta #3: Fiado por $12.90 con abono parcial de $7.00 (Debe $5.90)
            $f_v3 = $ahora->copy()->subMinutes(40);
            $v3_id = DB::table('ventas')->insertGetId([
                'user_id'         => $vendedor_id,
                'cliente'         => 'Doña Rosa (Vecina)',
                'telefono_cliente'=> '0991234567',
                'monto_total'     => 12.90,
                'costo_total'     => 8.78,
                'ganancia_total'  => 4.12,
                'saldo_pendiente' => 5.90,
                'metodo_pago'     => 'fiado',
                'estado_pago'     => 'parcial',
                'origen'          => 'telegram',
                'created_at'      => $f_v3,
                'updated_at'      => $ahora->copy()->subMinutes(15),
            ]);
            DB::table('detalles_venta')->insert([
                [
                    'venta_id' => $v3_id, 'producto_id' => $productos_ids['lomo'],
                    'peso_libras' => 2.50, 'precio_unitario_libra' => 3.00, 'costo_unitario_libra' => $costo_real_sesion,
                    'subtotal' => 7.50, 'ganancia' => 2.62, 'created_at' => $f_v3, 'updated_at' => $f_v3,
                ],
                [
                    'venta_id' => $v3_id, 'producto_id' => $productos_ids['chuleta'],
                    'peso_libras' => 2.00, 'precio_unitario_libra' => 2.70, 'costo_unitario_libra' => $costo_real_sesion,
                    'subtotal' => 5.40, 'ganancia' => 1.50, 'created_at' => $f_v3, 'updated_at' => $f_v3,
                ],
            ]);
            $registrar_kardex('lomo', $vendedor_id, 'venta', 2.50, "Venta fiada #{$v3_id} - Doña Rosa", $f_v3);
            $registrar_kardex('chuleta', $vendedor_id, 'venta', 2.00, "Venta fiada #{$v3_id} - Doña Rosa", $f_v3);

            // Abono registrado a la Venta #3
            DB::table('abonos_ventas')->insert([
                'venta_id'      => $v3_id,
                'user_id'       => $vendedor_id,
                'monto_abonado' => 7.00,
                'metodo_pago'   => 'efectivo',
                'observacion'   => 'Primer abono en efectivo en local',
                'created_at'    => $ahora->copy()->subMinutes(15),
                'updated_at'    => $ahora->copy()->subMinutes(15),
            ]);

            // Venta #4: Fiado pendiente total por $8.25
            $f_v4 = $ahora->copy()->subMinutes(10);
            $v4_id = DB::table('ventas')->insertGetId([
                'user_id'         => $vendedor_id,
                'cliente'         => 'Don Pedro (Tienda)',
                'telefono_cliente'=> '0987654321',
                'monto_total'     => 8.25,
                'costo_total'     => 5.86,
                'ganancia_total'  => 2.39,
                'saldo_pendiente' => 8.25,
                'metodo_pago'     => 'fiado',
                'estado_pago'     => 'pendiente',
                'origen'          => 'telegram',
                'created_at'      => $f_v4,
                'updated_at'      => $f_v4,
            ]);
            DB::table('detalles_venta')->insert([
                'venta_id' => $v4_id, 'producto_id' => $productos_ids['costilla'],
                'peso_libras' => 3.00, 'precio_unitario_libra' => 2.75, 'costo_unitario_libra' => $costo_real_sesion,
                'subtotal' => 8.25, 'ganancia' => 2.39, 'created_at' => $f_v4, 'updated_at' => $f_v4,
            ]);
            $registrar_kardex('costilla', $vendedor_id, 'venta', 3.00, "Venta fiada #{$v4_id} - Don Pedro", $f_v4);

            // 7. ACTUALIZAR STOCK FINAL Y COSTO REAL EN LA TABLA PRODUCTOS
            foreach ($stock_actual as $clave => $libras_finales) {
                DB::table('productos')
                    ->where('id', $productos_ids[$clave])
                    ->update([
                        'stock_libras'       => $libras_finales,
                        'costo_actual_libra' => $costo_real_sesion,
                        'updated_at'         => $ahora,
                    ]);
            }
        });
    }
}
