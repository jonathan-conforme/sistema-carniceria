<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class VerificarBotTelegram
{
    public function handle(Request $request, Closure $next): Response
    {
        $secreto_esperado = config('services.telegram_bot.secret');
        $secreto_recibido = $request->header('X-Telegram-Bot-Api-Secret-Token');

        if (empty($secreto_esperado) || !hash_equals($secreto_esperado, (string) $secreto_recibido)) {
            return response()->json(['ok' => false], 401);
        }

        $chat_id = data_get($request->all(), 'message.chat.id')
            ?? data_get($request->all(), 'callback_query.message.chat.id');

        if (!$chat_id) {
            return response()->json(['ok' => true]);
        }

        $usuario = User::where('telegram_chat_id', (string) $chat_id)->first();

        if (!$usuario) {
            // Responde 200 a Telegram para que no reintente el webhook en bucle
            return response()->json(['ok' => true]);
        }

        Auth::login($usuario);

        return $next($request);
    }
}
