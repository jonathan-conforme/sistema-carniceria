import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    ArcElement,
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    type ChartOptions,
    Filler,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    type ScriptableContext,
    Title,
    Tooltip,
} from 'chart.js';
import {
    AlertTriangle,
    ArrowUpRight,
    Beef,
    BookOpen,
    Flame,
    Scissors,
    ShoppingCart,
    Snowflake,
    TrendingUp,
    Wallet,
} from 'lucide-react';
import React, { useMemo } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface ResumenHoy {
    fecha: string;
    total_tickets: number;
    efectivo_real_caja: string | number;
    transferencia_real: string | number;
    fiado_hoy: string | number;
    ganancia_total: string | number;
    cartera_por_cobrar: string | number;
}

interface TopCorte {
    nombre: string;
    libras: string | number;
    ingresos: string | number;
}

interface CorteBajo {
    id: number;
    nombre: string;
    stock_libras: string | number;
    stock_minimo_libras: string | number;
}

interface Props {
    resumenHoy: ResumenHoy;
    graficaSemanal: {
        etiquetas: string[];
        ventas: number[];
        ganancias: number[];
    };
    distribucionPagos: {
        efectivo: number;
        transferencia: number;
        fiado: number;
    };
    topCortes: TopCorte[];
    brutoCamara: number;
    limpioVitrina: number;
    cortesBajos: CorteBajo[];
    porcentajeAprovechamiento: number;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

export default function Dashboard({
    resumenHoy,
    graficaSemanal,
    distribucionPagos,
    topCortes,
    brutoCamara,
    limpioVitrina,
    cortesBajos,
    porcentajeAprovechamiento,
}: Props) {
    const totalIngresosHoy = useMemo(() => {
        return (
            Number(resumenHoy.efectivo_real_caja) +
            Number(resumenHoy.transferencia_real) +
            Number(resumenHoy.fiado_hoy)
        );
    }, [resumenHoy]);

    // 1. Configuración Gráfica de Líneas / Área (Ventas vs Ganancias 7 días)
    const dataLinea = useMemo(
        () => ({
            labels: graficaSemanal.etiquetas,
            datasets: [
                {
                    label: 'Ventas Totales ($)',
                    data: graficaSemanal.ventas,
                    borderColor: '#E2424A',
                    backgroundColor: (context: ScriptableContext<'line'>) => {
                        const chart = context.chart;
                        const { ctx, chartArea } = chart;
                        if (!chartArea) return 'rgba(226, 66, 74, 0.15)';
                        const gradient = ctx.createLinearGradient(
                            0,
                            chartArea.top,
                            0,
                            chartArea.bottom
                        );
                        gradient.addColorStop(0, 'rgba(226, 66, 74, 0.32)');
                        gradient.addColorStop(1, 'rgba(226, 66, 74, 0.01)');
                        return gradient;
                    },
                    borderWidth: 3,
                    pointBackgroundColor: '#34222E',
                    pointBorderColor: '#F9BF8F',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    fill: true,
                    tension: 0.4,
                },
                {
                    label: 'Ganancia Neta ($)',
                    data: graficaSemanal.ganancias,
                    borderColor: '#10B981',
                    backgroundColor: (context: ScriptableContext<'line'>) => {
                        const chart = context.chart;
                        const { ctx, chartArea } = chart;
                        if (!chartArea) return 'rgba(16, 185, 129, 0.12)';
                        const gradient = ctx.createLinearGradient(
                            0,
                            chartArea.top,
                            0,
                            chartArea.bottom
                        );
                        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
                        gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
                        return gradient;
                    },
                    borderWidth: 2.5,
                    pointBackgroundColor: '#10B981',
                    pointBorderColor: '#FFFFFF',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4,
                },
            ],
        }),
        [graficaSemanal]
    );

    const opcionesLinea: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        animation: {
            duration: 1200,
            easing: 'easeOutQuart',
        },
        plugins: {
            legend: {
                position: 'top',
                align: 'end',
                labels: {
                    usePointStyle: true,
                    boxWidth: 8,
                    color: '#34222E',
                    font: { weight: 'bold', size: 12 },
                },
            },
            tooltip: {
                backgroundColor: '#34222E',
                titleColor: '#F9BF8F',
                bodyColor: '#FEE9D6',
                borderColor: 'rgba(249, 191, 143, 0.35)',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 12,
                callbacks: {
                    label: (ctx) => ` ${ctx.dataset.label}: $${Number(ctx.parsed.y).toFixed(2)}`,
                },
            },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: '#34222E', font: { weight: 'bold', size: 11 } },
            },
            y: {
                beginAtZero: true,
                border: { display: false },
                grid: { color: 'rgba(52, 34, 46, 0.06)' },
                ticks: {
                    color: '#34222E',
                    font: { size: 11 },
                    callback: (value) => `$${value}`,
                },
            },
        },
    };

    // 2. Configuración Gráfica de Dona (Métodos de Pago)
    const totalPagosMes =
        distribucionPagos.efectivo +
        distribucionPagos.transferencia +
        distribucionPagos.fiado;

    const dataDona = useMemo(
        () => ({
            labels: ['Efectivo', 'Transferencia', 'Fiado'],
            datasets: [
                {
                    data:
                        totalPagosMes > 0
                            ? [
                                  distribucionPagos.efectivo,
                                  distribucionPagos.transferencia,
                                  distribucionPagos.fiado,
                              ]
                            : [1, 0, 0],
                    backgroundColor:
                        totalPagosMes > 0
                            ? ['#34222E', '#F9BF8F', '#E2424A']
                            : ['#FEE9D6', '#FEE9D6', '#FEE9D6'],
                    borderColor: '#FFFFFF',
                    borderWidth: 4,
                    hoverOffset: 8,
                },
            ],
        }),
        [distribucionPagos, totalPagosMes]
    );

    const opcionesDona: ChartOptions<'doughnut'> = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        animation: {
            animateRotate: true,
            animateScale: true,
            duration: 1300,
            easing: 'easeOutBack',
        },
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    usePointStyle: true,
                    padding: 16,
                    color: '#34222E',
                    font: { weight: 'bold', size: 12 },
                },
            },
            tooltip: {
                enabled: totalPagosMes > 0,
                backgroundColor: '#34222E',
                titleColor: '#F9BF8F',
                bodyColor: '#FEE9D6',
                padding: 12,
                cornerRadius: 12,
                callbacks: {
                    label: (ctx) => {
                        const val = Number(ctx.parsed);
                        const pct =
                            totalPagosMes > 0 ? ((val / totalPagosMes) * 100).toFixed(1) : '0';
                        return ` ${ctx.label}: $${val.toFixed(2)} (${pct}%)`;
                    },
                },
            },
        },
    };

    // 3. Configuración Gráfica de Barras (Top Cortes más vendidos)
    const dataBarras = useMemo(
        () => ({
            labels: topCortes.map((c) => c.nombre),
            datasets: [
                {
                    label: 'Libras despachadas (lb)',
                    data: topCortes.map((c) => Number(c.libras)),
                    backgroundColor: ['#E2424A', '#34222E', '#F9BF8F', '#C8323A', '#56394C'],
                    borderRadius: 10,
                    barThickness: 22,
                },
            ],
        }),
        [topCortes]
    );

    const opcionesBarras: ChartOptions<'bar'> = {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 1100,
            easing: 'easeOutQuart',
            delay: (ctx) => ctx.dataIndex * 140,
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#34222E',
                titleColor: '#F9BF8F',
                bodyColor: '#FEE9D6',
                padding: 12,
                cornerRadius: 12,
                callbacks: {
                    label: (ctx) => {
                        const corte = topCortes[ctx.dataIndex];
                        const ingreso = corte ? Number(corte.ingresos).toFixed(2) : '0.00';
                        return ` ${Number(ctx.parsed.x).toFixed(2)} lb ($${ingreso})`;
                    },
                },
            },
        },
        scales: {
            x: {
                beginAtZero: true,
                border: { display: false },
                grid: { color: 'rgba(52, 34, 46, 0.06)' },
                ticks: {
                    color: '#34222E',
                    font: { size: 11 },
                    callback: (value) => `${value} lb`,
                },
            },
            y: {
                grid: { display: false },
                ticks: { color: '#34222E', font: { weight: 'bold', size: 12 } },
            },
        },
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard | Carnicería" />

            <div translate="no" className="min-h-[calc(100vh-4rem)] bg-[#FDF8F3] p-4 sm:p-6">
                {/* ENCABEZADO DE BIENVENIDA Y ACCESOS DIRECTOS */}
                <div className="mb-6 flex flex-col justify-between gap-4 rounded-3xl border border-[#F9BF8F]/60 bg-gradient-to-r from-[#34222E] via-[#2D1D28] to-[#23161F] p-5 text-white shadow-[0_10px_30px_-10px_rgba(52,34,46,0.35)] sm:flex-row sm:items-center sm:p-6">
                    <div className="flex items-center gap-4">
                        <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-[#E2424A] text-white shadow-lg">
                            <Flame className="h-7 w-7" />
                        </div>
                        <div>
                            <span className="text-[11px] font-bold tracking-widest text-[#F9BF8F] uppercase">
                                Resumen Ejecutivo · {resumenHoy.fecha}
                            </span>
                            <h1 className="text-xl font-black tracking-tight sm:text-2xl">
                                Control General de Carnicería
                            </h1>
                            <p className="text-xs text-[#FEE9D6]/75">
                                Rendimiento de cortes, flujo de caja y ventas sincronizadas Web + Telegram
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2.5">
                        <Link
                            href="/pos"
                            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#E2424A] px-4 text-xs font-black text-white shadow-md transition hover:brightness-110 sm:text-sm"
                        >
                            <ShoppingCart className="h-4 w-4" />
                            <span>Abrir Mostrador</span>
                            <ArrowUpRight className="h-4 w-4" />
                        </Link>

                        <Link
                            href="/inventario"
                            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#F9BF8F]/35 bg-white/10 px-4 text-xs font-bold text-[#FEE9D6] transition hover:bg-white/20 sm:text-sm"
                        >
                            <Scissors className="h-4 w-4 text-[#F9BF8F]" />
                            <span>Despiece</span>
                        </Link>
                    </div>
                </div>

                {/* 4 TARJETAS KPI PRINCIPALES */}
                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-3xl border border-[#F9BF8F]/75 bg-white p-5 shadow-[0_4px_20px_-6px_rgba(52,34,46,0.08)]">
                        <div className="mb-3 flex items-center justify-between">
                            <span className="text-xs font-extrabold tracking-wider text-[#34222E]/60 uppercase">
                                Efectivo Real en Caja
                            </span>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                                <Wallet className="h-5 w-5" />
                            </div>
                        </div>
                        <p className="text-3xl font-black tabular-nums text-[#34222E]">
                            ${Number(resumenHoy.efectivo_real_caja).toFixed(2)}
                        </p>
                        <p className="mt-1.5 text-xs font-semibold text-[#34222E]/60 tabular-nums">
                            Movimiento total hoy: ${totalIngresosHoy.toFixed(2)} ({resumenHoy.total_tickets}{' '}
                            tickets)
                        </p>
                    </div>

                    <div className="rounded-3xl border border-[#F9BF8F]/75 bg-white p-5 shadow-[0_4px_20px_-6px_rgba(52,34,46,0.08)]">
                        <div className="mb-3 flex items-center justify-between">
                            <span className="text-xs font-extrabold tracking-wider text-[#34222E]/60 uppercase">
                                Ganancia Neta Hoy
                            </span>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FEE9D6] text-[#E2424A]">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                        </div>
                        <p className="text-3xl font-black tabular-nums text-emerald-700">
                            ${Number(resumenHoy.ganancia_total).toFixed(2)}
                        </p>
                        <p className="mt-1.5 text-xs font-semibold text-[#34222E]/60">
                            Calculada con costo real tras merma
                        </p>
                    </div>

                    <div className="rounded-3xl border border-[#F9BF8F]/75 bg-white p-5 shadow-[0_4px_20px_-6px_rgba(52,34,46,0.08)]">
                        <div className="mb-3 flex items-center justify-between">
                            <span className="text-xs font-extrabold tracking-wider text-[#34222E]/60 uppercase">
                                Cartera por Cobrar
                            </span>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-[#E2424A]">
                                <BookOpen className="h-5 w-5" />
                            </div>
                        </div>
                        <p className="text-3xl font-black tabular-nums text-[#E2424A]">
                            ${Number(resumenHoy.cartera_por_cobrar).toFixed(2)}
                        </p>
                        <p className="mt-1.5 text-xs font-semibold text-[#34222E]/60 tabular-nums">
                            Fiado hoy: ${Number(resumenHoy.fiado_hoy).toFixed(2)}
                        </p>
                    </div>

                    <div className="rounded-3xl border border-[#F9BF8F]/75 bg-white p-5 shadow-[0_4px_20px_-6px_rgba(52,34,46,0.08)]">
                        <div className="mb-3 flex items-center justify-between">
                            <span className="text-xs font-extrabold tracking-wider text-[#34222E]/60 uppercase">
                                Inventario Activo
                            </span>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                                <Snowflake className="h-5 w-5" />
                            </div>
                        </div>
                        <p className="text-3xl font-black tabular-nums text-[#34222E]">
                            {limpioVitrina.toFixed(1)}{' '}
                            <span className="text-sm font-bold text-[#34222E]/60">lb vitrina</span>
                        </p>
                        <p className="mt-1.5 text-xs font-semibold text-[#34222E]/60 tabular-nums">
                            Cámara sin picar: {brutoCamara.toFixed(1)} lb · Rendimiento:{' '}
                            {porcentajeAprovechamiento}%
                        </p>
                    </div>
                </div>

                {/* FILA CENTRAL DE GRÁFICAS ANIMADAS */}
                <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
                    {/* Gráfica 1: Ventas vs Ganancia (8 cols) */}
                    <div className="rounded-3xl border border-[#F9BF8F]/75 bg-white p-6 shadow-[0_4px_20px_-6px_rgba(52,34,46,0.08)] lg:col-span-8">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <h2 className="text-base font-black text-[#34222E]">
                                    Evolución de Ventas y Ganancia (Últimos 7 días)
                                </h2>
                                <p className="text-xs text-[#34222E]/60">
                                    Comparativa diaria entre ingreso bruto cobrado y utilidad neta
                                </p>
                            </div>
                        </div>
                        <div className="h-72 w-full">
                            <Line data={dataLinea} options={opcionesLinea} />
                        </div>
                    </div>

                    {/* Gráfica 2: Métodos de Pago (4 cols) */}
                    <div className="flex flex-col justify-between rounded-3xl border border-[#F9BF8F]/75 bg-white p-6 shadow-[0_4px_20px_-6px_rgba(52,34,46,0.08)] lg:col-span-4">
                        <div className="mb-2">
                            <h2 className="text-base font-black text-[#34222E]">
                                Métodos de Pago (30 días)
                            </h2>
                            <p className="text-xs text-[#34222E]/60">
                                Distribución de ingresos por canal de cobro
                            </p>
                        </div>

                        <div className="relative my-auto h-60 w-full">
                            <Doughnut data={dataDona} options={opcionesDona} />
                            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-8">
                                <span className="text-[10px] font-bold text-[#34222E]/50 uppercase">
                                    Total 30d
                                </span>
                                <strong className="text-lg font-black tabular-nums text-[#34222E]">
                                    ${totalPagosMes.toFixed(0)}
                                </strong>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FILA INFERIOR: TOP CORTES + ALERTAS DE REPOSICIÓN */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    {/* Gráfica 3: Top Cortes más vendidos (7 cols) */}
                    <div className="rounded-3xl border border-[#F9BF8F]/75 bg-white p-6 shadow-[0_4px_20px_-6px_rgba(52,34,46,0.08)] lg:col-span-7">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h2 className="flex items-center gap-2 text-base font-black text-[#34222E]">
                                    <Beef className="h-5 w-5 text-[#E2424A]" />
                                    <span>Top 5 Cortes Más Vendidos (Libras)</span>
                                </h2>
                                <p className="text-xs text-[#34222E]/60">
                                    Cortes con mayor rotación en mostrador durante los últimos 30 días
                                </p>
                            </div>
                        </div>

                        {topCortes.length === 0 ? (
                            <div className="flex h-56 items-center justify-center rounded-2xl border-2 border-dashed border-[#F9BF8F] text-xs font-semibold text-[#34222E]/55">
                                Registra ventas en el POS o Telegram para visualizar el ranking de cortes.
                            </div>
                        ) : (
                            <div className="h-60 w-full">
                                <Bar data={dataBarras} options={opcionesBarras} />
                            </div>
                        )}
                    </div>

                    {/* Alertas de Stock Bajo en Vitrina (5 cols) */}
                    <div className="flex flex-col justify-between rounded-3xl border border-[#F9BF8F]/75 bg-white p-6 shadow-[0_4px_20px_-6px_rgba(52,34,46,0.08)] lg:col-span-5">
                        <div>
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="flex items-center gap-2 text-base font-black text-[#34222E]">
                                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                                    <span>Alertas de Vitrina</span>
                                </h2>
                                <Link
                                    href="/inventario"
                                    className="text-xs font-extrabold text-[#E2424A] hover:underline"
                                >
                                    Ir a despiece →
                                </Link>
                            </div>

                            {cortesBajos.length === 0 ? (
                                <div className="rounded-2xl bg-emerald-50/80 p-6 text-center">
                                    <p className="text-sm font-extrabold text-emerald-800">
                                        ¡Vitrina bien abastecida!
                                    </p>
                                    <p className="mt-1 text-xs text-emerald-700/80">
                                        Ningún corte está por debajo de su stock mínimo.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {cortesBajos.map((corte) => (
                                        <div
                                            key={corte.id}
                                            className="flex items-center justify-between rounded-2xl border border-amber-200/80 bg-amber-50/50 px-4 py-3"
                                        >
                                            <div>
                                                <p className="text-sm font-extrabold text-[#34222E]">
                                                    {corte.nombre}
                                                </p>
                                                <p className="text-[11px] text-[#34222E]/60 tabular-nums">
                                                    Mínimo sugerido:{' '}
                                                    {Number(corte.stock_minimo_libras).toFixed(2)} lb
                                                </p>
                                            </div>
                                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black tabular-nums text-amber-800">
                                                {Number(corte.stock_libras).toFixed(2)} lb
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
