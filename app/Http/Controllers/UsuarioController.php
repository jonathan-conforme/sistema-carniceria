<?php

namespace App\Http\Controllers;

use App\Http\Requests\ActualizarUsuarioRequest;
use App\Http\Requests\GuardarUsuarioRequest;
use App\Models\User;
use App\Services\UsuarioService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use App\Services\TelegramBotService;


class UsuarioController extends Controller
{
    public function __construct(
        private readonly UsuarioService $usuario_service,
        private readonly TelegramBotService $telegram_service,
    ) {}

    public function index(Request $request): Response
    {
        abort_unless($request->user()?->tieneRol('administrador'), 403);

        $usuarios = User::query()
            ->orderBy('rol')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'rol', 'telegram_chat_id', 'created_at']);

        return Inertia::render('Usuarios/Index', [
            'usuarios' => $usuarios,
        ]);
    }

    public function store(GuardarUsuarioRequest $request): RedirectResponse
    {
        $this->usuario_service->crearUsuario($request->validated());

        return back()->with('success', 'Usuario creado correctamente.');
    }

    public function update(ActualizarUsuarioRequest $request, User $usuario): RedirectResponse
    {
        $this->usuario_service->actualizarUsuario($usuario, $request->validated());

        return back()->with('success', 'Usuario actualizado correctamente.');
    }
    public function probarTelegram(Request $request, User $usuario): RedirectResponse
    {
        abort_unless($request->user()?->tieneRol('administrador'), 403);

        $resultado = $this->telegram_service->enviarPruebaConexion($usuario);

        if (! $resultado['ok']) {
            return back()->withErrors(['telegram_prueba' => $resultado['error']]);
        }

        return back()->with('success', $resultado['mensaje']);
    }
}
