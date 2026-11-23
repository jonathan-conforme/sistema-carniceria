import AppLayout from '@/layouts/app-layout';
import { Head, router, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    CheckCircle2,
    Info,
    Loader2,
    Pencil,
    Send,
    ShieldCheck,
    UserCheck,
    UserCog,
    UserPlus,
    Users,
    X,
} from 'lucide-react';
import { FormEvent, useState } from 'react';

interface Usuario {
    id: number;
    name: string;
    email: string;
    rol: 'administrador' | 'vendedor';
    telegram_chat_id: string | null;
}

interface Props {
    usuarios: Usuario[];
}

export default function UsuariosIndex({ usuarios }: Props) {
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [probandoId, setProbandoId] = useState<number | null>(null);
    const [resultadoPrueba, setResultadoPrueba] = useState<{ ok: boolean; texto: string } | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        email: '',
        password: '',
        rol: 'vendedor' as 'administrador' | 'vendedor',
        telegram_chat_id: '',
    });

    const seleccionarParaEditar = (usuario: Usuario) => {
        clearErrors();
        setEditandoId(usuario.id);
        setData({
            name: usuario.name,
            email: usuario.email,
            password: '',
            rol: usuario.rol,
            telegram_chat_id: usuario.telegram_chat_id ?? '',
        });
    };

    const cancelarEdicion = () => {
        clearErrors();
        setEditandoId(null);
        reset();
    };

    const guardar = (e: FormEvent) => {
        e.preventDefault();
        setResultadoPrueba(null);

        if (editandoId) {
            put(`/usuarios/${editandoId}`, {
                preserveScroll: true,
                onSuccess: () => cancelarEdicion(),
            });
            return;
        }

        post('/usuarios', {
            preserveScroll: true,
            onSuccess: () => cancelarEdicion(),
        });
    };

    const probarConexionBot = (usuario: Usuario) => {
        setProbandoId(usuario.id);
        setResultadoPrueba(null);

        router.post(
            `/usuarios/${usuario.id}/probar-telegram`,
            {},
            {
                preserveScroll: true,
                onSuccess: (page) => {
                    const flashSuccess = (page.props as { flash?: { success?: string } }).flash?.success;
                    setResultadoPrueba({
                        ok: true,
                        texto: flashSuccess ?? `Mensaje de prueba enviado correctamente a ${usuario.name}.`,
                    });
                },
                onError: (errs) => {
                    setResultadoPrueba({
                        ok: false,
                        texto: errs.telegram_prueba ?? `No se pudo enviar el mensaje a ${usuario.name}.`,
                    });
                },
                onFinish: () => setProbandoId(null),
            },
        );
    };

    const vinculadosCount = usuarios.filter((u) => Boolean(u.telegram_chat_id)).length;

    return (
        <AppLayout breadcrumbs={[{ title: 'Usuarios y Telegram', href: '/usuarios' }]}>
            <Head title="Usuarios y Telegram" />

            <div className="min-h-screen bg-[#FAF6F2] p-4 md:p-6 space-y-6">
                {/* Cabecera */}
                <div className="rounded-2xl bg-white p-5 shadow-sm border border-[#34222E]/10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-[#34222E] text-[#FEE9D6] flex items-center justify-center shrink-0">
                            <Users className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-[#34222E]">Usuarios y Acceso al Bot de Telegram</h1>
                            <p className="text-sm text-[#34222E]/65">
                                Gestión de administradores, vendedores y vinculación de cuentas para operar desde Telegram
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex items-center gap-2 rounded-xl bg-[#FAF6F2] border border-[#34222E]/10 px-3.5 py-2 text-xs font-bold text-[#34222E]">
                            <Users className="h-4 w-4 text-[#E2424A]" />
                            {usuarios.length} {usuarios.length === 1 ? 'Usuario' : 'Usuarios'}
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-xl bg-[#34222E] px-3.5 py-2 text-xs font-bold text-[#FEE9D6]">
                            <Send className="h-4 w-4 text-[#F9BF8F]" />
                            {vinculadosCount} con Bot activo
                        </div>
                    </div>
                </div>

                {/* Guía rápida de vinculación */}
                <div className="rounded-2xl bg-[#FEE9D6]/60 border border-[#34222E]/10 p-4 flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-[#34222E] text-[#F9BF8F] flex items-center justify-center shrink-0 mt-0.5">
                        <Info className="h-4 w-4" />
                    </div>
                    <div className="text-xs text-[#34222E]/85 leading-relaxed">
                        <span className="font-bold uppercase tracking-wider text-[#34222E] block mb-0.5">
                            Verificación automática activa:
                        </span>
                        Antes de guardar, el sistema comprueba con Telegram que el número exista y que el usuario ya haya presionado{' '}
                        <code className="rounded bg-white px-1.5 py-0.5 font-mono font-bold text-[#E2424A]">/start</code> en el bot de la carnicería.
                    </div>
                </div>

                {/* Aviso de resultado al probar conexión */}
                {resultadoPrueba && (
                    <div
                        className={`rounded-2xl p-4 border flex items-center justify-between gap-3 ${
                            resultadoPrueba.ok
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : 'bg-[#E2424A]/10 border-[#E2424A]/30 text-[#E2424A]'
                        }`}
                    >
                        <div className="flex items-center gap-2.5 text-sm font-semibold">
                            {resultadoPrueba.ok ? (
                                <CheckCircle2 className="h-5 w-5 shrink-0" />
                            ) : (
                                <AlertCircle className="h-5 w-5 shrink-0" />
                            )}
                            <span>{resultadoPrueba.texto}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setResultadoPrueba(null)}
                            className="p-1 rounded-lg hover:bg-black/5"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* Contenido Principal: Formulario + Tabla */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Formulario de Creación / Edición */}
                    <form
                        onSubmit={guardar}
                        className="rounded-2xl bg-white p-5 border border-[#34222E]/10 shadow-sm space-y-4 h-fit"
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-[#34222E]/10">
                            <div className="flex items-center gap-2.5">
                                <div className="h-9 w-9 rounded-xl bg-[#FEE9D6] text-[#34222E] flex items-center justify-center">
                                    {editandoId ? <UserCog className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                                </div>
                                <h2 className="text-base font-bold text-[#34222E]">
                                    {editandoId ? 'Editar Usuario' : 'Nuevo Usuario'}
                                </h2>
                            </div>

                            {editandoId && (
                                <span className="rounded-full bg-[#E2424A]/15 px-2.5 py-0.5 text-[11px] font-bold uppercase text-[#E2424A]">
                                    Editando #{editandoId}
                                </span>
                            )}
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold uppercase text-[#34222E]/60 mb-1">
                                Nombre completo
                            </label>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className="w-full rounded-xl border border-[#34222E]/15 bg-[#FAF6F2] px-3 py-2 text-sm text-[#34222E] focus:border-[#E2424A] focus:outline-none"
                                placeholder="Ej. Carlos Pérez"
                                required
                            />
                            {errors.name && <p className="mt-1 text-xs font-medium text-[#E2424A]">{errors.name}</p>}
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold uppercase text-[#34222E]/60 mb-1">
                                Correo electrónico
                            </label>
                            <input
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                className="w-full rounded-xl border border-[#34222E]/15 bg-[#FAF6F2] px-3 py-2 text-sm text-[#34222E] focus:border-[#E2424A] focus:outline-none"
                                placeholder="vendedor@carniceria.com"
                                required
                            />
                            {errors.email && <p className="mt-1 text-xs font-medium text-[#E2424A]">{errors.email}</p>}
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold uppercase text-[#34222E]/60 mb-1">
                                Contraseña{' '}
                                {editandoId && (
                                    <span className="normal-case font-normal text-[#34222E]/50">(vacío para mantener)</span>
                                )}
                            </label>
                            <input
                                type="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                className="w-full rounded-xl border border-[#34222E]/15 bg-[#FAF6F2] px-3 py-2 text-sm text-[#34222E] focus:border-[#E2424A] focus:outline-none"
                                placeholder={editandoId ? '••••••••' : 'Mínimo 8 caracteres'}
                                required={!editandoId}
                            />
                            {errors.password && <p className="mt-1 text-xs font-medium text-[#E2424A]">{errors.password}</p>}
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold uppercase text-[#34222E]/60 mb-1">
                                Rol en el sistema
                            </label>
                            <select
                                value={data.rol}
                                onChange={(e) => setData('rol', e.target.value as 'administrador' | 'vendedor')}
                                className="w-full rounded-xl border border-[#34222E]/15 bg-[#FAF6F2] px-3 py-2 text-sm text-[#34222E] focus:border-[#E2424A] focus:outline-none"
                            >
                                <option value="vendedor">Vendedor (Mostrador y Bot)</option>
                                <option value="administrador">Administrador (Acceso Total)</option>
                            </select>
                            {errors.rol && <p className="mt-1 text-xs font-medium text-[#E2424A]">{errors.rol}</p>}
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold uppercase text-[#34222E]/60 mb-1">
                                ID de Chat de Telegram
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={data.telegram_chat_id}
                                onChange={(e) => setData('telegram_chat_id', e.target.value)}
                                className="w-full rounded-xl border border-[#34222E]/15 bg-[#FAF6F2] px-3 py-2 font-mono text-sm text-[#34222E] focus:border-[#E2424A] focus:outline-none"
                                placeholder="Ej. 853444869"
                            />
                            {errors.telegram_chat_id && (
                                <p className="mt-1 text-xs font-medium text-[#E2424A]">{errors.telegram_chat_id}</p>
                            )}
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <button
                                type="submit"
                                disabled={processing}
                                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#E2424A] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#E2424A]/90 transition disabled:opacity-50"
                            >
                                {editandoId ? <UserCog className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                                {processing ? 'Verificando y guardando...' : editandoId ? 'Actualizar Usuario' : 'Crear Usuario'}
                            </button>

                            {editandoId && (
                                <button
                                    type="button"
                                    onClick={cancelarEdicion}
                                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-[#34222E]/15 bg-[#FAF6F2] px-3.5 py-2.5 text-sm font-semibold text-[#34222E] hover:bg-[#34222E] hover:text-[#FEE9D6] transition"
                                >
                                    <X className="h-4 w-4" />
                                    Cancelar
                                </button>
                            )}
                        </div>
                    </form>

                    {/* Tabla de Usuarios */}
                    <div className="lg:col-span-2 rounded-2xl bg-white p-5 border border-[#34222E]/10 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-bold text-[#34222E]">
                                Equipo Registrado ({usuarios.length})
                            </h2>
                        </div>

                        {usuarios.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-[#34222E]/20 p-8 text-center text-sm text-[#34222E]/55">
                                No hay usuarios registrados en el sistema.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-[#34222E]/10 text-[11px] font-bold uppercase text-[#34222E]/60">
                                            <th className="pb-3">Usuario</th>
                                            <th className="pb-3">Rol</th>
                                            <th className="pb-3">Telegram ID</th>
                                            <th className="pb-3 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#34222E]/10">
                                        {usuarios.map((u) => {
                                            const esActivoEdicion = editandoId === u.id;
                                            const estaProbando = probandoId === u.id;

                                            return (
                                                <tr
                                                    key={u.id}
                                                    className={`transition ${
                                                        esActivoEdicion ? 'bg-[#FEE9D6]/40' : 'hover:bg-[#FAF6F2]/70'
                                                    }`}
                                                >
                                                    <td className="py-3">
                                                        <div className="font-bold text-[#34222E]">{u.name}</div>
                                                        <div className="text-xs text-[#34222E]/65">{u.email}</div>
                                                    </td>
                                                    <td className="py-3">
                                                        <span
                                                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                                                                u.rol === 'administrador'
                                                                    ? 'bg-[#34222E] text-[#FEE9D6]'
                                                                    : 'bg-[#FEE9D6] text-[#34222E]'
                                                            }`}
                                                        >
                                                            {u.rol === 'administrador' ? (
                                                                <ShieldCheck className="h-3.5 w-3.5 text-[#F9BF8F]" />
                                                            ) : (
                                                                <UserCheck className="h-3.5 w-3.5 text-[#E2424A]" />
                                                            )}
                                                            {u.rol}
                                                        </span>
                                                    </td>
                                                    <td className="py-3">
                                                        {u.telegram_chat_id ? (
                                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 font-mono text-xs font-bold text-emerald-700">
                                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                                {u.telegram_chat_id}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E2424A]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#E2424A]">
                                                                <AlertCircle className="h-3.5 w-3.5" />
                                                                Sin vincular
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 text-right">
                                                        <div className="inline-flex items-center justify-end gap-1.5">
                                                            {u.telegram_chat_id && (
                                                                <button
                                                                    type="button"
                                                                    disabled={estaProbando}
                                                                    onClick={() => probarConexionBot(u)}
                                                                    title="Enviar mensaje de prueba a Telegram"
                                                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#34222E] px-2.5 py-1.5 text-xs font-bold text-[#FEE9D6] hover:bg-[#34222E]/90 transition disabled:opacity-50"
                                                                >
                                                                    {estaProbando ? (
                                                                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#F9BF8F]" />
                                                                    ) : (
                                                                        <Send className="h-3.5 w-3.5 text-[#F9BF8F]" />
                                                                    )}
                                                                    Probar
                                                                </button>
                                                            )}

                                                            <button
                                                                type="button"
                                                                onClick={() => seleccionarParaEditar(u)}
                                                                className="inline-flex items-center gap-1.5 rounded-lg border border-[#34222E]/15 bg-[#FAF6F2] px-3 py-1.5 text-xs font-bold text-[#34222E] hover:bg-[#34222E] hover:text-[#FEE9D6] transition"
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                                Editar
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
