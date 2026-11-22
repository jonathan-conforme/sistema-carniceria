import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import { Toaster } from 'sonner';
import { Beef, BookOpen, Knife, Package, ShoppingCart } from 'lucide-react';

interface Props {
    titulo: string;
    subtitulo: string;
    children: React.ReactNode;
    derecha?: React.ReactNode;
}

export default function CarniceriaLayout({ titulo, subtitulo, children, derecha }: Props) {
    const { url } = usePage();

    const enlaces = [
        { href: '/pos', label: 'Mostrador POS', icono: ShoppingCart },
        { href: '/inventario', label: 'Inventario y Despiece', icono: Package },
        { href: '/fiados', label: 'Cartera Fiados', icono: BookOpen },
    ];

    return (
        <div translate="no" className="min-h-screen bg-[#FEE9D6]/45 text-[#34222E]">
            <Toaster position="top-center" richColors />

            <header className="bg-[#34222E] text-[#FEE9D6] shadow-md">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E2424A] text-white shadow">
                            <Beef className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight text-white">
                                {titulo}
                            </h1>
                            <p className="text-xs text-[#F9BF8F]">{subtitulo}</p>
                        </div>
                    </div>

                    {/* Navegación principal */}
                    <nav className="flex flex-wrap items-center gap-1.5 rounded-xl bg-white/10 p-1">
                        {enlaces.map((item) => {
                            const Icono = item.icono;
                            const activo = url.startsWith(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition sm:text-sm ${
                                        activo
                                            ? 'bg-[#E2424A] text-white shadow'
                                            : 'text-[#FEE9D6]/85 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    <Icono className="h-4 w-4" />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {derecha && <div className="flex items-center gap-2">{derecha}</div>}
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
        </div>
    );
}
