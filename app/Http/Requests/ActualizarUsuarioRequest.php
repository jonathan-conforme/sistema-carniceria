<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use App\Services\TelegramBotService;

class ActualizarUsuarioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->tieneRol('administrador') ?? false;
    }

    public function rules(): array
    {
        $usuario = $this->route('usuario');

        return [
            'name'             => ['required', 'string', 'max:255'],
            'email'            => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($usuario->id)],
            'password'         => ['nullable', 'string', 'min:8'],
            'rol'              => ['required', 'in:administrador,vendedor'],
            'telegram_chat_id' => ['nullable', 'regex:/^[0-9]+$/', 'max:30', Rule::unique('users', 'telegram_chat_id')->ignore($usuario->id)],
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique'            => 'Ese correo ya está registrado en otro usuario.',
            'telegram_chat_id.regex'  => 'El ID de Telegram debe contener solo números (obtenlo en @userinfobot).',
            'telegram_chat_id.unique' => 'Ese ID de Telegram ya está vinculado a otro usuario.',
        ];
    }
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $chatId = trim((string) ($this->input('telegram_chat_id') ?? ''));

                if ($chatId === '' || $validator->errors()->has('telegram_chat_id')) {
                    return;
                }

                $verificacion = app(TelegramBotService::class)->verificarChat($chatId);

                if (! $verificacion['ok']) {
                    $validator->errors()->add('telegram_chat_id', $verificacion['error']);
                }
            },
        ];
    }
}
