<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\TelegramBotService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TelegramWebhookController extends Controller
{
    public function __invoke(Request $request, TelegramBotService $bot_service): JsonResponse
    {
        $bot_service->procesarWebhook($request->user(), $request->all());

        return response()->json(['ok' => true]);
    }
}
