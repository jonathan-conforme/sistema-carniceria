<?php

namespace App\Services;

use App\Models\User;

class UsuarioService
{
    public function crearUsuario(array $datos): User
    {
        return User::create([
            'name'             => trim($datos['name']),
            'email'            => mb_strtolower(trim($datos['email'])),
            'password'         => $datos['password'],
            'rol'              => $datos['rol'],
            'telegram_chat_id' => ! empty($datos['telegram_chat_id']) ? trim($datos['telegram_chat_id']) : null,
        ]);
    }

    public function actualizarUsuario(User $usuario, array $datos): User
    {
        $payload = [
            'name'             => trim($datos['name']),
            'email'            => mb_strtolower(trim($datos['email'])),
            'rol'              => $datos['rol'],
            'telegram_chat_id' => ! empty($datos['telegram_chat_id']) ? trim($datos['telegram_chat_id']) : null,
        ];

        if (! empty($datos['password'])) {
            $payload['password'] = $datos['password'];
        }

        $usuario->update($payload);

        return $usuario;
    }
}
