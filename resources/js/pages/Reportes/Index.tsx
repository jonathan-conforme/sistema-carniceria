import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { descargarReportePdf } from '@/utils/exportarReportePdf';
import { FileText } from 'lucide-react';
import {
    ArrowDownToLine,
    BarChart3,
    Calendar,
    CreditCard,
    DollarSign,
    Filter,
    Printer,
    Scale,
    TrendingUp,
    Wallet,
} from 'lucide-react';
import { useState } from 'react';

interface Filtros {
    fecha_inicio: string;
    fecha_fin: string;
    origen: string;
    metodo_pago: string;
}

interface Resumen {
    total_facturado: number;
    cantidad_tickets: number;
    ingreso_real_caja: number;
    ventas_efectivo: number;
    ventas_transferencia: number;
    abonos_efectivo: number;
    abonos_transferencia: number;
    efectivo_total: number;
    transferencia_total: number;
    ventas_fiado_total: number;
    fiado_pendiente: number;
    ganancia_neta: number;
    margen_porcentaje: number;
    tickets_web: number;
    tickets_telegram: number;
}

interface VentaCorte {
    nombre: string;
    libras: number;
    total: number;
    ganancia: number;
    participacion: number;
}

interface MermaPeriodo {
    compras_count: number;
    inversion_camara: number;
    sesiones_count: number;
    bruto_procesado: number;
    util_obtenido: number;
    merma_total: number;
    porcentaje_merma: number;
}

interface Ticket {
    id: number;
    cliente: string;
    metodo_pago: string;
    monto_total: number;
    saldo_pendiente: number;
    ganancia_total: number;
    origen: string;
    fecha: string;
}

interface Props {
    filtros: Filtros;
    resumen: Resumen;
    ventasPorCorte: VentaCorte[];
    mermaPeriodo: MermaPeriodo;
    tickets: Ticket[];
}

const money = (n: number) =>
    `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ReportesIndex({ filtros, resumen, ventasPorCorte, mermaPeriodo, tickets }: Props) {
    const [form, setForm] = useState<Filtros>(filtros);

    const aplicarFiltros = (nuevos: Filtros) => {
        setForm(nuevos);
        router.get('/reportes', nuevos, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const aplicarRangoRapido = (tipo: 'hoy' | 'ayer' | '7dias' | 'mes') => {
        const hoy = new Date();
        const formatear = (d: Date) => d.toISOString().split('T')[0];

        let inicio = formatear(hoy);
        let fin = formatear(hoy);

        if (tipo === 'ayer') {
            const ayer = new Date(hoy);
            ayer.setDate(hoy.getDate() - 1);
            inicio = formatear(ayer);
            fin = formatear(ayer);
        } else if (tipo === '7dias') {
            const hace7 = new Date(hoy);
            hace7.setDate(hoy.getDate() - 6);
            inicio = formatear(hace7);
        } else if (tipo === 'mes') {
            const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
            inicio = formatear(primerDia);
        }

        aplicarFiltros({ ...form, fecha_inicio: inicio, fecha_fin: fin });
    };

    const urlExportar = `/reportes/exportar?fecha_inicio=${form.fecha_inicio}&fecha_fin=${form.fecha_fin}&origen=${form.origen}&metodo_pago=${form.metodo_pago}`;

    return (
        <AppLayout breadcrumbs={[{ title: 'Reportes y Arqueo', href: '/reportes' }]}>
            <Head title="Reportes y Arqueo" />

            <div className="min-h-screen bg-[#FAF6F2] p-4 md:p-6 space-y-6">
                {/* Cabecera */}
                <div className="rounded-2xl bg-white p-5 shadow-sm border border-[#34222E]/10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-[#34222E] text-[#FEE9D6] flex items-center justify-center shrink-0">
                            <BarChart3 className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-[#34222E]">Reportes, Arqueo y Rentabilidad</h1>
                            <p className="text-sm text-[#34222E]/65">
                                Consolidado de mostrador web y bot de Telegram ({resumen.tickets_web} Web · {resumen.tickets_telegram} Telegram)
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 print:hidden">
                        <a
                            href={urlExportar}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#34222E] px-4 py-2.5 text-sm font-semibold text-[#FEE9D6] hover:bg-[#34222E]/90 transition"
                        >
                            <ArrowDownToLine className="h-4 w-4 text-[#F9BF8F]" />
                            Exportar Excel (CSV)
                        </a>
                        <button
                            type="button"
                            onClick={() => descargarReportePdf(filtros, resumen, ventasPorCorte, mermaPeriodo, tickets)}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#E2424A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#E2424A]/90 transition"
                        >
                            <FileText className="h-4 w-4" />
                            Descargar PDF
                        </button>
                    </div>
                </div>

                {/* Barra de Filtros */}
                <div className="rounded-2xl bg-white p-4 shadow-sm border border-[#34222E]/10 space-y-4 print:hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#34222E]/60">
                            <Calendar className="h-4 w-4 text-[#E2424A]" />
                            Rangos Rápidos:
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: 'hoy', label: 'Hoy' },
                                { id: 'ayer', label: 'Ayer' },
                                { id: '7dias', label: 'Últimos 7 días' },
                                { id: 'mes', label: 'Este Mes' },
                            ].map((preset) => (
                                <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => aplicarRangoRapido(preset.id as 'hoy' | 'ayer' | '7dias' | 'mes')}
                                    className="rounded-lg border border-[#34222E]/15 bg-[#FAF6F2] px-3 py-1.5 text-xs font-semibold text-[#34222E] hover:bg-[#34222E] hover:text-[#FEE9D6] transition"
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-[#34222E]/10">
                        <div>
                            <label className="block text-[11px] font-bold uppercase text-[#34222E]/60 mb-1">Desde</label>
                            <input
                                type="date"
                                value={form.fecha_inicio}
                                onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
                                className="w-full rounded-xl border border-[#34222E]/15 bg-[#FAF6F2] px-3 py-2 text-sm text-[#34222E]"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold uppercase text-[#34222E]/60 mb-1">Hasta</label>
                            <input
                                type="date"
                                value={form.fecha_fin}
                                onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
                                className="w-full rounded-xl border border-[#34222E]/15 bg-[#FAF6F2] px-3 py-2 text-sm text-[#34222E]"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold uppercase text-[#34222E]/60 mb-1">Canal</label>
                            <select
                                value={form.origen}
                                onChange={(e) => setForm({ ...form, origen: e.target.value })}
                                className="w-full rounded-xl border border-[#34222E]/15 bg-[#FAF6F2] px-3 py-2 text-sm text-[#34222E]"
                            >
                                <option value="todos">Todos los canales</option>
                                <option value="web">Mostrador Web</option>
                                <option value="telegram">Bot Telegram</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold uppercase text-[#34222E]/60 mb-1">Método de Pago</label>
                            <select
                                value={form.metodo_pago}
                                onChange={(e) => setForm({ ...form, metodo_pago: e.target.value })}
                                className="w-full rounded-xl border border-[#34222E]/15 bg-[#FAF6F2] px-3 py-2 text-sm text-[#34222E]"
                            >
                                <option value="todos">Todos los métodos</option>
                                <option value="efectivo">Efectivo</option>
                                <option value="transferencia">Transferencia</option>
                                <option value="fiado">Fiado / Crédito</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                type="button"
                                onClick={() => aplicarFiltros(form)}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#E2424A] px-4 py-2 text-sm font-bold text-white hover:bg-[#E2424A]/90 transition"
                            >
                                <Filter className="h-4 w-4" />
                                Filtrar Reporte
                            </button>
                        </div>
                    </div>
                </div>

                {/* KPIs Principales */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div className="rounded-2xl bg-[#34222E] p-5 text-[#FEE9D6] shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#F9BF8F]">Ingreso Real en Caja</span>
                            <Wallet className="h-5 w-5 text-[#F9BF8F]" />
                        </div>
                        <p className="mt-2 text-3xl font-extrabold">{money(resumen.ingreso_real_caja)}</p>
                        <p className="mt-1 text-xs text-[#FEE9D6]/75">
                            Efectivo: {money(resumen.efectivo_total)} · Transf: {money(resumen.transferencia_total)}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-white p-5 border border-[#34222E]/10 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#34222E]/60">Total Facturado</span>
                            <DollarSign className="h-5 w-5 text-[#E2424A]" />
                        </div>
                        <p className="mt-2 text-3xl font-extrabold text-[#34222E]">{money(resumen.total_facturado)}</p>
                        <p className="mt-1 text-xs text-[#34222E]/65">
                            En {resumen.cantidad_tickets} tickets registrados
                        </p>
                    </div>

                    <div className="rounded-2xl bg-white p-5 border border-[#34222E]/10 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#34222E]/60">Ganancia Neta</span>
                            <TrendingUp className="h-5 w-5 text-emerald-600" />
                        </div>
                        <p className="mt-2 text-3xl font-extrabold text-emerald-700">{money(resumen.ganancia_neta)}</p>
                        <p className="mt-1 text-xs text-[#34222E]/65">
                            Margen promedio: <strong className="text-[#34222E]">{resumen.margen_porcentaje}%</strong>
                        </p>
                    </div>

                    <div className="rounded-2xl bg-white p-5 border border-[#34222E]/10 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#34222E]/60">Fiado Pendiente Período</span>
                            <CreditCard className="h-5 w-5 text-[#E2424A]" />
                        </div>
                        <p className="mt-2 text-3xl font-extrabold text-[#E2424A]">{money(resumen.fiado_pendiente)}</p>
                        <p className="mt-1 text-xs text-[#34222E]/65">
                            Abonos cobrados en fechas: {money(resumen.abonos_efectivo + resumen.abonos_transferencia)}
                        </p>
                    </div>
                </div>

                {/* Sección Media: Cortes Vendidos + Arqueo Detallado y Merma */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Rendimiento por Corte */}
                    <div className="lg:col-span-2 rounded-2xl bg-white p-5 border border-[#34222E]/10 shadow-sm">
                        <h2 className="text-base font-bold text-[#34222E] mb-4">Rendimiento por Corte en el Período</h2>

                        {ventasPorCorte.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-[#34222E]/20 p-8 text-center text-sm text-[#34222E]/55">
                                No hay ventas de cortes registradas en este rango de fechas.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-[#34222E]/10 text-[11px] font-bold uppercase text-[#34222E]/60">
                                            <th className="pb-3">Corte</th>
                                            <th className="pb-3 text-right">Libras</th>
                                            <th className="pb-3 text-right">Vendido</th>
                                            <th className="pb-3 text-right">Ganancia</th>
                                            <th className="pb-3 text-right">Peso %</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#34222E]/10">
                                        {ventasPorCorte.map((corte, idx) => (
                                            <tr key={idx} className="hover:bg-[#FAF6F2]/70">
                                                <td className="py-3 font-semibold text-[#34222E]">{corte.nombre}</td>
                                                <td className="py-3 text-right text-[#34222E]/80">{corte.libras.toFixed(2)} lb</td>
                                                <td className="py-3 text-right font-bold text-[#34222E]">{money(corte.total)}</td>
                                                <td className="py-3 text-right font-semibold text-emerald-700">{money(corte.ganancia)}</td>
                                                <td className="py-3 text-right">
                                                    <span className="inline-block rounded-full bg-[#FEE9D6] px-2.5 py-0.5 text-xs font-bold text-[#34222E]">
                                                        {corte.participacion}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Columna Derecha: Desglose de Caja + Merma */}
                    <div className="space-y-6">
                        {/* Arqueo de Cajón */}
                        <div className="rounded-2xl bg-white p-5 border border-[#34222E]/10 shadow-sm space-y-3">
                            <h2 className="text-base font-bold text-[#34222E]">Arqueo Detallado de Caja</h2>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between py-1.5 border-b border-[#34222E]/10">
                                    <span className="text-[#34222E]/70">Ventas directas (Efectivo)</span>
                                    <span className="font-semibold text-[#34222E]">{money(resumen.ventas_efectivo)}</span>
                                </div>
                                <div className="flex justify-between py-1.5 border-b border-[#34222E]/10">
                                    <span className="text-[#34222E]/70">Abonos fiados (Efectivo)</span>
                                    <span className="font-semibold text-[#34222E]">{money(resumen.abonos_efectivo)}</span>
                                </div>
                                <div className="flex justify-between py-1.5 border-b border-[#34222E]/10 bg-[#FEE9D6]/40 px-2 rounded-lg">
                                    <span className="font-bold text-[#34222E]">Total Efectivo en Cajón</span>
                                    <span className="font-extrabold text-[#34222E]">{money(resumen.efectivo_total)}</span>
                                </div>
                                <div className="flex justify-between py-1.5 border-b border-[#34222E]/10 pt-2">
                                    <span className="text-[#34222E]/70">Ventas directas (Transf.)</span>
                                    <span className="font-semibold text-[#34222E]">{money(resumen.ventas_transferencia)}</span>
                                </div>
                                <div className="flex justify-between py-1.5 border-b border-[#34222E]/10">
                                    <span className="text-[#34222E]/70">Abonos fiados (Transf.)</span>
                                    <span className="font-semibold text-[#34222E]">{money(resumen.abonos_transferencia)}</span>
                                </div>
                                <div className="flex justify-between py-1.5 bg-[#FEE9D6]/40 px-2 rounded-lg">
                                    <span className="font-bold text-[#34222E]">Total Bancos / Transf.</span>
                                    <span className="font-extrabold text-[#34222E]">{money(resumen.transferencia_total)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Control de Despiece y Merma */}
                        <div className="rounded-2xl bg-white p-5 border border-[#34222E]/10 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-base font-bold text-[#34222E]">Cámara y Merma</h2>
                                <Scale className="h-5 w-5 text-[#E2424A]" />
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="rounded-xl bg-[#FAF6F2] p-3">
                                    <span className="text-[11px] uppercase font-bold text-[#34222E]/60">Bruto Procesado</span>
                                    <p className="text-lg font-extrabold text-[#34222E]">{mermaPeriodo.bruto_procesado} lb</p>
                                </div>
                                <div className="rounded-xl bg-[#FAF6F2] p-3">
                                    <span className="text-[11px] uppercase font-bold text-[#34222E]/60">Limpio Vitrina</span>
                                    <p className="text-lg font-extrabold text-emerald-700">{mermaPeriodo.util_obtenido} lb</p>
                                </div>
                                <div className="rounded-xl bg-[#FEE9D6]/60 p-3">
                                    <span className="text-[11px] uppercase font-bold text-[#34222E]/60">Merma Período</span>
                                    <p className="text-lg font-extrabold text-[#E2424A]">
                                        {mermaPeriodo.merma_total} lb ({mermaPeriodo.porcentaje_merma}%)
                                    </p>
                                </div>
                                <div className="rounded-xl bg-[#FAF6F2] p-3">
                                    <span className="text-[11px] uppercase font-bold text-[#34222E]/60">Compras Cámara</span>
                                    <p className="text-lg font-extrabold text-[#34222E]">{money(mermaPeriodo.inversion_camara)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabla Detallada de Tickets */}
                <div className="rounded-2xl bg-white p-5 border border-[#34222E]/10 shadow-sm">
                    <h2 className="text-base font-bold text-[#34222E] mb-4">
                        Historial de Tickets en el Período ({tickets.length})
                    </h2>

                    {tickets.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-[#34222E]/20 p-8 text-center text-sm text-[#34222E]/55">
                            No se encontraron tickets con los filtros seleccionados.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-[#34222E]/10 text-[11px] font-bold uppercase text-[#34222E]/60">
                                        <th className="pb-3">#</th>
                                        <th className="pb-3">Fecha</th>
                                        <th className="pb-3">Cliente</th>
                                        <th className="pb-3">Canal</th>
                                        <th className="pb-3">Método</th>
                                        <th className="pb-3 text-right">Total</th>
                                        <th className="pb-3 text-right">Saldo</th>
                                        <th className="pb-3 text-right">Ganancia</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#34222E]/10">
                                    {tickets.map((t) => (
                                        <tr key={t.id} className="hover:bg-[#FAF6F2]/70">
                                            <td className="py-3 font-bold text-[#34222E]">#{t.id}</td>
                                            <td className="py-3 text-[#34222E]/75">{t.fecha}</td>
                                            <td className="py-3 font-medium text-[#34222E]">{t.cliente}</td>
                                            <td className="py-3">
                                                <span
                                                    className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${t.origen === 'telegram'
                                                            ? 'bg-[#E2424A]/15 text-[#E2424A]'
                                                            : 'bg-[#34222E]/10 text-[#34222E]'
                                                        }`}
                                                >
                                                    {t.origen}
                                                </span>
                                            </td>
                                            <td className="py-3 capitalize text-[#34222E]/80">{t.metodo_pago}</td>
                                            <td className="py-3 text-right font-bold text-[#34222E]">{money(t.monto_total)}</td>
                                            <td className="py-3 text-right font-semibold text-[#E2424A]">
                                                {t.saldo_pendiente > 0 ? money(t.saldo_pendiente) : '—'}
                                            </td>
                                            <td className="py-3 text-right font-semibold text-emerald-700">{money(t.ganancia_total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
