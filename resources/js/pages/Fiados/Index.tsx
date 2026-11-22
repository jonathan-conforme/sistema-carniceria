import React, { useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { toast } from 'sonner';
import CarniceriaLayout from '@/layouts/CarniceriaLayout';
import {
    Banknote,
    BookOpen,
    CheckCircle2,
    Clock,
    Landmark,
    Monitor,
    Receipt,
    Search,
    Smartphone,
    TrendingUp,
    UserCheck,
    Wallet,
    X,
} from 'lucide-react';

interface TicketFiado {
    id: number;
    cliente: string;
    monto_total: string | number;
    saldo_pendiente: string | number;
    origen: string;
    created_at: string;
}

interface VentaHistorial {
    id: number;
    cliente: string | null;
    metodo_pago: 'efectivo' | 'transferencia' | 'fiado';
    monto_total: string | number;
    saldo_pendiente: string | number;
    ganancia_total: string | number;
    origen: string;
    created_at: string;
}

interface AbonoHistorial {
    id: number;
    venta_id: number;
    cliente: string;
    monto_abonado: string | number;
    metodo_pago: 'efectivo' | 'transferencia';
    created_at: string;
}

interface ResumenHoy {
    fecha: string;
    total_tickets: number;
    efectivo_real_caja: string | number;
    transferencia_real: string | number;
    fiado_hoy: string | number;
    ganancia_total: string | number;
    cartera_por_cobrar: string | number;
}

interface Props {
    fiadosPendientes: TicketFiado[];
    ventasRecientes: VentaHistorial[];
    abonosRecientes: AbonoHistorial[];
    resumenHoy: ResumenHoy;
}

export default function FiadosIndex({
    fiadosPendientes,
    ventasRecientes,
    abonosRecientes,
    resumenHoy,
}: Props) {
    const [tab, setTab] = useState<'deudores' | 'historial'>('deudores');
    const [busqueda, setBusqueda] = useState('');

    // Modal de cobro / abono
    const [ticketCobro, setTicketCobro] = useState<TicketFiado | null>(null);
    const [montoAbono, setMontoAbono] = useState('');
    const [metodoAbono, setMetodoAbono] = useState<'efectivo' | 'transferencia'>('efectivo');
    const [procesando, setProcesando] = useState(false);

    // Agrupar tickets pendientes por cliente
    const deudoresAgrupados = useMemo(() => {
        const mapa = new Map<
            string,
            { cliente: string; totalDeuda: number; tickets: TicketFiado[] }
        >();

        fiadosPendientes.forEach((t) => {
            const clave = t.cliente.trim().toLowerCase();
            const actual = mapa.get(clave);
            const saldo = Number(t.saldo_pendiente);

            if (actual) {
                actual.totalDeuda = Number((actual.totalDeuda + saldo).toFixed(2));
                actual.tickets.push(t);
            } else {
                mapa.set(clave, {
                    cliente: t.cliente.trim(),
                    totalDeuda: Number(saldo.toFixed(2)),
                    tickets: [t],
                });
            }
        });

        return Array.from(mapa.values())
            .filter((d) => d.cliente.toLowerCase().includes(busqueda.toLowerCase().trim()))
            .sort((a, b) => b.totalDeuda - a.totalDeuda);
    }, [fiadosPendientes, busqueda]);

    const abrirModalCobro = (ticket: TicketFiado) => {
        setTicketCobro(ticket);
        setMontoAbono(Number(ticket.saldo_pendiente).toFixed(2));
        setMetodoAbono('efectivo');
    };

    const registrarAbono = (e: React.FormEvent) => {
        e.preventDefault();
        if (!ticketCobro) return;

        const monto = parseFloat(montoAbono);
        const maxSaldo = Number(ticketCobro.saldo_pendiente);

        if (isNaN(monto) || monto <= 0 || monto > maxSaldo) {
            toast.warning(`Ingresa un monto válido entre $0.01 y $${maxSaldo.toFixed(2)}`);
            return;
        }

        setProcesando(true);

        router.post(
            '/ventas/abonos',
            {
                venta_id: ticketCobro.id,
                monto_abonado: monto,
                metodo_pago: metodoAbono,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(`Abono de $${monto.toFixed(2)} registrado a ${ticketCobro.cliente}`);
                    setTicketCobro(null);
                },
                onError: (errs) => {
                    toast.error(Object.values(errs)[0] || 'No se pudo registrar el abono');
                },
                onFinish: () => setProcesando(false),
            }
        );
    };

    const formatearFecha = (fechaIso: string) => {
        try {
            return new Date(fechaIso).toLocaleString('es-EC', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return fechaIso;
        }
    };

    return (
        <AppLayout>
        <CarniceriaLayout
            titulo="Cartera de Fiados y Caja"
            subtitulo="Cobro de cuentas pendientes, cierre diario y auditoría de tickets"
        >
            <Head title="Cartera Fiados y Caja | Carnicería" />

            {/* KPIs DE CAJA Y CARTERA */}
            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div className="rounded-2xl border border-[#F9BF8F]/80 bg-white p-4 shadow-sm">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase text-[#34222E]/60">
                            Por Cobrar Total
                        </span>
                        <BookOpen className="h-5 w-5 text-[#E2424A]" />
                    </div>
                    <p className="text-2xl font-black text-[#E2424A]">
                        ${Number(resumenHoy.cartera_por_cobrar).toFixed(2)}
                    </p>
                    <p className="mt-1 text-xs text-[#34222E]/60">
                        Fiado hoy: ${Number(resumenHoy.fiado_hoy).toFixed(2)}
                    </p>
                </div>

                <div className="rounded-2xl border border-[#F9BF8F]/80 bg-white p-4 shadow-sm">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase text-[#34222E]/60">
                            Efectivo en Caja
                        </span>
                        <Wallet className="h-5 w-5 text-emerald-600" />
                    </div>
                    <p className="text-2xl font-black text-[#34222E]">
                        ${Number(resumenHoy.efectivo_real_caja).toFixed(2)}
                    </p>
                    <p className="mt-1 text-xs text-[#34222E]/60">Ventas + abonos hoy</p>
                </div>

                <div className="rounded-2xl border border-[#F9BF8F]/80 bg-white p-4 shadow-sm">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase text-[#34222E]/60">
                            Transferencias Hoy
                        </span>
                        <Landmark className="h-5 w-5 text-sky-600" />
                    </div>
                    <p className="text-2xl font-black text-[#34222E]">
                        ${Number(resumenHoy.transferencia_real).toFixed(2)}
                    </p>
                    <p className="mt-1 text-xs text-[#34222E]/60">Ingresos bancarios</p>
                </div>

                <div className="rounded-2xl border border-[#F9BF8F]/80 bg-white p-4 shadow-sm">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase text-[#34222E]/60">
                            Ganancia Neta Hoy
                        </span>
                        <TrendingUp className="h-5 w-5 text-emerald-600" />
                    </div>
                    <p className="text-2xl font-black text-emerald-700">
                        ${Number(resumenHoy.ganancia_total).toFixed(2)}
                    </p>
                    <p className="mt-1 text-xs text-[#34222E]/60">
                        {resumenHoy.total_tickets} tickets emitidos
                    </p>
                </div>
            </div>

            {/* PESTAÑAS */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setTab('deudores')}
                        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                            tab === 'deudores'
                                ? 'bg-[#34222E] text-white shadow'
                                : 'border border-[#F9BF8F] bg-white text-[#34222E] hover:bg-[#FEE9D6]/60'
                        }`}
                    >
                        <UserCheck className="h-4 w-4 text-[#F9BF8F]" />
                        <span>Deudores ({deudoresAgrupados.length})</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setTab('historial')}
                        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                            tab === 'historial'
                                ? 'bg-[#34222E] text-white shadow'
                                : 'border border-[#F9BF8F] bg-white text-[#34222E] hover:bg-[#FEE9D6]/60'
                        }`}
                    >
                        <Receipt className="h-4 w-4 text-[#F9BF8F]" />
                        <span>Historial de Tickets y Abonos</span>
                    </button>
                </div>

                {tab === 'deudores' && (
                    <div className="relative w-full sm:w-72">
                        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#34222E]/50" />
                        <input
                            type="text"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar cliente deudor..."
                            className="w-full rounded-xl border border-[#F9BF8F] bg-white py-2 pr-4 pl-10 text-sm focus:border-[#E2424A] focus:outline-none"
                        />
                    </div>
                )}
            </div>

            {/* =================================================================
                TAB 1: CLIENTES CON SALDO PENDIENTE
               ================================================================= */}
            {tab === 'deudores' && (
                <>
                    {deudoresAgrupados.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[#F9BF8F] bg-white p-12 text-center">
                            <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-emerald-500" />
                            <p className="text-base font-bold text-[#34222E]">
                                ¡No hay saldos pendientes por cobrar!
                            </p>
                            <p className="text-sm text-[#34222E]/60">
                                Todos los clientes están al día con sus pagos.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {deudoresAgrupados.map((deudor) => (
                                <div
                                    key={deudor.cliente}
                                    className="flex flex-col justify-between rounded-2xl border border-[#F9BF8F]/80 bg-white p-5 shadow-sm"
                                >
                                    <div>
                                        <div className="mb-3 flex items-center justify-between border-b border-[#FEE9D6] pb-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FEE9D6] font-black text-[#E2424A]">
                                                    {deudor.cliente.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-[#34222E]">
                                                        {deudor.cliente}
                                                    </h3>
                                                    <span className="text-xs text-[#34222E]/60">
                                                        {deudor.tickets.length}{' '}
                                                        {deudor.tickets.length === 1
                                                            ? 'ticket pendiente'
                                                            : 'tickets pendientes'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <span className="block text-[11px] uppercase text-[#34222E]/60">
                                                    Deuda Total
                                                </span>
                                                <span className="text-xl font-black text-[#E2424A]">
                                                    ${deudor.totalDeuda.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            {deudor.tickets.map((t) => (
                                                <div
                                                    key={t.id}
                                                    className="flex items-center justify-between rounded-xl bg-[#FEE9D6]/40 px-3.5 py-2.5 text-xs"
                                                >
                                                    <div>
                                                        <span className="font-bold text-[#34222E]">
                                                            Ticket #{t.id}
                                                        </span>
                                                        <span className="ml-2 text-[#34222E]/60">
                                                            {formatearFecha(t.created_at)}
                                                        </span>
                                                        <span className="block text-[#34222E]/70">
                                                            Total original: $
                                                            {Number(t.monto_total).toFixed(2)}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-extrabold text-[#34222E]">
                                                            ${Number(t.saldo_pendiente).toFixed(2)}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => abrirModalCobro(t)}
                                                            className="rounded-lg bg-[#E2424A] px-3 py-1.5 font-bold text-white shadow-xs transition hover:bg-[#c9353c]"
                                                        >
                                                            Abonar
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* =================================================================
                TAB 2: HISTORIAL DE TICKETS Y ÚLTIMOS ABONOS
               ================================================================= */}
            {tab === 'historial' && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    <div className="overflow-x-auto rounded-2xl border border-[#F9BF8F]/80 bg-white shadow-sm lg:col-span-8">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#34222E] text-xs uppercase text-[#FEE9D6]">
                                <tr>
                                    <th className="px-4 py-3">Ticket</th>
                                    <th className="px-4 py-3">Pago / Cliente</th>
                                    <th className="px-4 py-3">Total</th>
                                    <th className="px-4 py-3">Ganancia</th>
                                    <th className="px-4 py-3">Canal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#FEE9D6]">
                                {ventasRecientes.map((v) => (
                                    <tr key={v.id} className="hover:bg-[#FEE9D6]/20">
                                        <td className="px-4 py-3">
                                            <span className="font-bold text-[#34222E]">#{v.id}</span>
                                            <span className="block text-xs text-[#34222E]/60">
                                                {formatearFecha(v.created_at)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                                                    v.metodo_pago === 'efectivo'
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : v.metodo_pago === 'transferencia'
                                                        ? 'bg-sky-100 text-sky-800'
                                                        : 'bg-amber-100 text-amber-800'
                                                }`}
                                            >
                                                {v.metodo_pago}
                                            </span>
                                            {v.cliente && (
                                                <span className="mt-0.5 block text-xs font-semibold text-[#34222E]">
                                                    {v.cliente}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 font-extrabold text-[#34222E]">
                                            ${Number(v.monto_total).toFixed(2)}
                                            {Number(v.saldo_pendiente) > 0 && (
                                                <span className="block text-[11px] font-bold text-[#E2424A]">
                                                    Debe: ${Number(v.saldo_pendiente).toFixed(2)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 font-bold text-emerald-700">
                                            ${Number(v.ganancia_total).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-[#34222E]/70">
                                            {v.origen === 'telegram' ? (
                                                <span className="inline-flex items-center gap-1">
                                                    <Smartphone className="h-3.5 w-3.5 text-sky-600" />
                                                    <span>Bot</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1">
                                                    <Monitor className="h-3.5 w-3.5 text-[#E2424A]" />
                                                    <span>Web</span>
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Últimos Abonos Recibidos */}
                    <div className="space-y-3 lg:col-span-4">
                        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase text-[#34222E]/70">
                            <Clock className="h-4 w-4 text-[#E2424A]" />
                            <span>Últimos Abonos Cobrados</span>
                        </h3>

                        {abonosRecientes.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-[#F9BF8F] bg-white p-6 text-center text-xs text-[#34222E]/60">
                                Aún no se han registrado abonos.
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {abonosRecientes.map((a) => (
                                    <div
                                        key={a.id}
                                        className="flex items-center justify-between rounded-2xl border border-[#F9BF8F]/80 bg-white p-3.5 shadow-xs"
                                    >
                                        <div>
                                            <p className="text-sm font-bold text-[#34222E]">
                                                {a.cliente}
                                            </p>
                                            <p className="text-xs text-[#34222E]/60">
                                                Ticket #{a.venta_id} · {a.metodo_pago}
                                            </p>
                                        </div>
                                        <span className="text-base font-black text-emerald-700">
                                            +${Number(a.monto_abonado).toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL REGISTRAR ABONO */}
            {ticketCobro && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#34222E]/70 p-4 backdrop-blur-xs">
                    <form
                        onSubmit={registrarAbono}
                        className="w-full max-w-md overflow-hidden rounded-2xl border border-[#F9BF8F] bg-white shadow-2xl"
                    >
                        <div className="flex items-center justify-between bg-[#34222E] px-5 py-4 text-white">
                            <div>
                                <h3 className="font-bold">Cobrar a {ticketCobro.cliente}</h3>
                                <p className="text-xs text-[#F9BF8F]">
                                    Ticket #{ticketCobro.id} · Saldo pendiente: $
                                    {Number(ticketCobro.saldo_pendiente).toFixed(2)}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setTicketCobro(null)}
                                className="rounded-lg p-1 text-[#FEE9D6] hover:bg-white/10"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4 p-5">
                            <div>
                                <div className="mb-1 flex items-center justify-between">
                                    <label className="text-xs font-bold uppercase text-[#34222E]/70">
                                        Monto que abona ($)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setMontoAbono(
                                                Number(ticketCobro.saldo_pendiente).toFixed(2)
                                            )
                                        }
                                        className="text-xs font-bold text-[#E2424A] hover:underline"
                                    >
                                        Pagar todo (${Number(ticketCobro.saldo_pendiente).toFixed(2)})
                                    </button>
                                </div>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    max={Number(ticketCobro.saldo_pendiente)}
                                    required
                                    autoFocus
                                    value={montoAbono}
                                    onChange={(e) => setMontoAbono(e.target.value)}
                                    className="w-full rounded-xl border-2 border-[#F9BF8F] px-4 py-3 text-2xl font-black text-[#34222E] focus:border-[#E2424A] focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setMetodoAbono('efectivo')}
                                    className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition ${
                                        metodoAbono === 'efectivo'
                                            ? 'border-[#34222E] bg-[#34222E] text-white'
                                            : 'border-[#F9BF8F] bg-white text-[#34222E]'
                                    }`}
                                >
                                    <Banknote className="h-4 w-4 text-[#F9BF8F]" />
                                    <span>Efectivo</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setMetodoAbono('transferencia')}
                                    className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition ${
                                        metodoAbono === 'transferencia'
                                            ? 'border-[#34222E] bg-[#34222E] text-white'
                                            : 'border-[#F9BF8F] bg-white text-[#34222E]'
                                    }`}
                                >
                                    <Landmark className="h-4 w-4 text-[#F9BF8F]" />
                                    <span>Transferencia</span>
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={procesando}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E2424A] py-3 text-sm font-extrabold text-white shadow transition hover:bg-[#c9353c] disabled:opacity-50"
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                <span>{procesando ? 'Guardando...' : 'Confirmar Abono'}</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </CarniceriaLayout>
        </AppLayout>
    );
}
