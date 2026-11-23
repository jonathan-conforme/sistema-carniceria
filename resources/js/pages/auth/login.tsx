import { Head, useForm } from '@inertiajs/react';
import { Eye, EyeOff, LoaderCircle, Lock, LogIn, Mail, ShieldCheck } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';

interface LoginForm {
    email: string;
    password: string;
    remember: boolean;
}

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

export default function Login({ status, canResetPassword }: LoginProps) {
    const [mostrarPassword, setMostrarPassword] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm<LoginForm>({
        email: '',
        password: '',
        remember: false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <AuthLayout
            title="Iniciar sesión"
            description="Ingresa tu correo y contraseña para acceder al sistema"
        >
            <Head title="Iniciar sesión" />

            {status && (
                <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-xs font-semibold text-emerald-800">
                    {status}
                </div>
            )}

            <form className="flex flex-col gap-5" onSubmit={submit}>
                <div className="grid gap-5">
                    {/* Correo electrónico */}
                    <div className="grid gap-1.5">
                        <Label
                            htmlFor="email"
                            className="text-[11px] font-bold uppercase tracking-wider text-[#34222E]/75"
                        >
                            Correo electrónico
                        </Label>
                        <div className="relative">
                            <Mail className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#34222E]/45" />
                            <Input
                                id="email"
                                type="email"
                                required
                                autoFocus
                                tabIndex={1}
                                autoComplete="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                placeholder="usuario@carniceria.com"
                                className="h-11 rounded-xl border-[#34222E]/15 bg-[#FAF6F2] pl-10 text-sm text-[#34222E] placeholder:text-[#34222E]/40 focus-visible:border-[#E2424A] focus-visible:ring-[#E2424A]/20"
                            />
                        </div>
                        <InputError message={errors.email} />
                    </div>

                    {/* Contraseña con botón mostrar/ocultar */}
                    <div className="grid gap-1.5">
                        <div className="flex items-center justify-between">
                            <Label
                                htmlFor="password"
                                className="text-[11px] font-bold uppercase tracking-wider text-[#34222E]/75"
                            >
                                Contraseña
                            </Label>
                            {canResetPassword && (
                                <TextLink
                                    href={route('password.request')}
                                    className="text-xs font-semibold text-[#E2424A] no-underline hover:text-[#34222E] hover:underline"
                                    tabIndex={5}
                                >
                                    ¿Olvidaste tu clave?
                                </TextLink>
                            )}
                        </div>
                        <div className="relative">
                            <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#34222E]/45" />
                            <Input
                                id="password"
                                type={mostrarPassword ? 'text' : 'password'}
                                required
                                tabIndex={2}
                                autoComplete="current-password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                placeholder="••••••••"
                                className="h-11 rounded-xl border-[#34222E]/15 bg-[#FAF6F2] pr-10 pl-10 text-sm text-[#34222E] placeholder:text-[#34222E]/40 focus-visible:border-[#E2424A] focus-visible:ring-[#E2424A]/20"
                            />
                            <button
                                type="button"
                                onClick={() => setMostrarPassword((prev) => !prev)}
                                tabIndex={-1}
                                aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                                className="absolute top-1/2 right-3 -translate-y-1/2 rounded-lg p-1 text-[#34222E]/50 transition hover:bg-[#FEE9D6]/60 hover:text-[#34222E]"
                            >
                                {mostrarPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        <InputError message={errors.password} />
                    </div>

                    {/* Recordar sesión */}
                    <div className="flex items-center space-x-2.5">
                        <Checkbox
                            id="remember"
                            name="remember"
                            tabIndex={3}
                            checked={data.remember}
                            onCheckedChange={(checked) => setData('remember', Boolean(checked))}
                            className="border-[#34222E]/30 data-[state=checked]:border-[#34222E] data-[state=checked]:bg-[#34222E] data-[state=checked]:text-[#FEE9D6]"
                        />
                        <Label
                            htmlFor="remember"
                            className="cursor-pointer text-xs font-medium text-[#34222E]/80 select-none"
                        >
                            Mantener sesión iniciada en este dispositivo
                        </Label>
                    </div>

                    {/* Botón principal */}
                    <Button
                        type="submit"
                        tabIndex={4}
                        disabled={processing}
                        className="mt-1 h-11 w-full rounded-xl bg-[#E2424A] text-sm font-bold text-white shadow-sm transition hover:bg-[#E2424A]/90 disabled:opacity-60"
                    >
                        {processing ? (
                            <>
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                                Ingresando...
                            </>
                        ) : (
                            <>
                                <LogIn className="h-4 w-4" />
                                Ingresar al sistema
                            </>
                        )}
                    </Button>
                </div>

                {/* Pie informativo sin enlace de registro público */}
                <div className="flex items-center justify-center gap-1.5 rounded-xl border border-[#34222E]/10 bg-[#FEE9D6]/50 px-3 py-2.5 text-center text-xs font-medium text-[#34222E]/75">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-[#34222E]" />
                    <span>Acceso exclusivo para personal autorizado</span>
                </div>
            </form>
        </AuthLayout>
    );
}
