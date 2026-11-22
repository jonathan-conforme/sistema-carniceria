import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    AlertTriangle,
    Beef,
    Check,
    Edit3,
    Layers,
    PackagePlus,
    Plus,
    Scale,
    Scissors,
    Search,
    Snowflake,
    Trash2,
    TrendingUp,
    X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Toaster, toast } from 'sonner';

interface Producto {
    id: number;
    nombre: string;
    precio_venta_libra: string | number;
    costo_actual_libra: string | number;
    stock_libras: string | number;
    stock_minimo_libras: string | number;
    activo: boolean;
}

interface CompraCamara {
    id: number;
    descripcion: string;
    peso_inicial_libras: string | number;
    peso_disponible_bruto_libras: string | number;
    costo_total: string | number;
    costo_base_libra: string | number;
    fecha_compra: string;
}

interface DespieceHistorial {
    id: number;
    compra_descripcion: string;
    pieza_origen: string;
    peso_bruto_usado_libras: string | number;
    peso_util_obtenido_libras: string | number;
    merma_libras: string | number;
    costo_real_libra_sesion: string | number;
    created_at: string;
}

interface Props {
    productos: Producto[];
    comprasCamara: CompraCamara[];
    despiecesRecientes: DespieceHistorial[];
}

type TabActiva = 'vitrina' | 'despiece' | 'camara';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Inventario y Despiece',
        href: '/inventario',
    },
];

export default function InventarioIndex({
    productos,
    comprasCamara,
    despiecesRecientes,
}: Props) {
    const [tab, setTab] = useState<TabActiva>('vitrina');
    const [busquedaCorte, setBusquedaCorte] = useState('');

    // Estado para Nuevo Corte
    const [mostrarNuevoCorte, setMostrarNuevoCorte] = useState(false);
    const [nuevoCorte, setNuevoCorte] = useState({
        nombre: '',
        precio_venta_libra: '',
        stock_libras: '0',
        stock_minimo_libras: '5',
    });

    // Estado para edición inline de producto
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [formEdit, setFormEdit] = useState({
        nombre: '',
        precio_venta_libra: '',
        stock_minimo_libras: '',
        activo: true,
    });

    // Estado para Nueva Compra en Cámara
    const [formCompra, setFormCompra] = useState({
        descripcion: '',
        peso_inicial_libras: '',
        costo_total: '',
        fecha_compra: new Date().toISOString().slice(0, 10),
    });

    // Estado para Despiece Parcial
    const comprasConSaldo = useMemo(
        () => comprasCamara.filter((c) => Number(c.peso_disponible_bruto_libras) > 0),
        [comprasCamara]
    );

    const [compraId, setCompraId] = useState<string>(
        comprasConSaldo[0] ? String(comprasConSaldo[0].id) : ''
    );
    const [piezaOrigen, setPiezaOrigen] = useState('pierna');
    const [pesoBrutoUsado, setPesoBrutoUsado] = useState('');
    const [detallesDespiece, setDetallesDespiece] = useState<
        { producto_id: string; libras_obtenidas: string }[]
    >([{ producto_id: '', libras_obtenidas: '' }]);
    const [guardando, setGuardando] = useState(false);

    const productosFiltrados = useMemo(
        () =>
            productos.filter((p) =>
                p.nombre.toLowerCase().includes(busquedaCorte.toLowerCase().trim())
            ),
        [productos, busquedaCorte]
    );

    // KPIs globales
    const brutoTotalCamara = useMemo(
        () => comprasCamara.reduce((acc, c) => acc + Number(c.peso_disponible_bruto_libras), 0),
        [comprasCamara]
    );
    const limpioTotalVitrina = useMemo(
        () =>
            productos
                .filter((p) => p.activo)
                .reduce((acc, p) => acc + Number(p.stock_libras), 0),
        [productos]
    );
    const alertasStock = useMemo(
        () =>
            productos.filter(
                (p) => p.activo && Number(p.stock_libras) <= Number(p.stock_minimo_libras)
            ).length,
        [productos]
    );

    // Simulación de merma y costo real en tiempo real para el despiece
    const simulacionDespiece = useMemo(() => {
        const compraSel = comprasCamara.find((c) => String(c.id) === compraId);
        const costoBase = compraSel ? Number(compraSel.costo_base_libra) : 0;
        const bruto = Math.max(0, parseFloat(pesoBrutoUsado) || 0);
        const util = detallesDespiece.reduce(
            (acc, d) => acc + Math.max(0, parseFloat(d.libras_obtenidas) || 0),
            0
        );
        const merma = Math.max(0, bruto - util);
        const porcentajeMerma = bruto > 0 ? (merma / bruto) * 100 : 0;
        const costoInsumo = bruto * costoBase;
        const costoRealLibra = util > 0 ? costoInsumo / util : 0;

        return {
            compraSel,
            bruto: Number(bruto.toFixed(2)),
            util: Number(util.toFixed(2)),
            merma: Number(merma.toFixed(2)),
            porcentajeMerma: Number(porcentajeMerma.toFixed(1)),
            costoRealLibra: Number(costoRealLibra.toFixed(2)),
            excedeBruto: util > bruto && bruto > 0,
        };
    }, [compraId, comprasCamara, pesoBrutoUsado, detallesDespiece]);

    // Acciones CRUD Productos
    const crearCorte = (e: React.FormEvent) => {
        e.preventDefault();
        setGuardando(true);
        router.post('/inventario/productos', nuevoCorte, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Nuevo corte agregado al catálogo');
                setNuevoCorte({
                    nombre: '',
                    precio_venta_libra: '',
                    stock_libras: '0',
                    stock_minimo_libras: '5',
                });
                setMostrarNuevoCorte(false);
            },
            onError: (errs) => toast.error(Object.values(errs)[0] || 'Error al guardar corte'),
            onFinish: () => setGuardando(false),
        });
    };

    const iniciarEdicion = (p: Producto) => {
        setEditandoId(p.id);
        setFormEdit({
            nombre: p.nombre,
            precio_venta_libra: String(p.precio_venta_libra),
            stock_minimo_libras: String(p.stock_minimo_libras),
            activo: p.activo,
        });
    };

    const guardarEdicion = (id: number) => {
        setGuardando(true);
        router.put(`/inventario/productos/${id}`, formEdit, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Corte actualizado correctamente');
                setEditandoId(null);
            },
            onError: (errs) => toast.error(Object.values(errs)[0] || 'Error al actualizar'),
            onFinish: () => setGuardando(false),
        });
    };

    // Acción Nueva Compra
    const registrarCompra = (e: React.FormEvent) => {
        e.preventDefault();
        setGuardando(true);
        router.post('/inventario/compras', formCompra, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Compra ingresada a cámara frigorífica');
                setFormCompra({
                    descripcion: '',
                    peso_inicial_libras: '',
                    costo_total: '',
                    fecha_compra: new Date().toISOString().slice(0, 10),
                });
            },
            onError: (errs) => toast.error(Object.values(errs)[0] || 'Error en compra'),
            onFinish: () => setGuardando(false),
        });
    };

    // Acción Despiece
    const agregarFilaCorte = () => {
        setDetallesDespiece((prev) => [...prev, { producto_id: '', libras_obtenidas: '' }]);
    };

    const quitarFilaCorte = (index: number) => {
        setDetallesDespiece((prev) => prev.filter((_, idx) => idx !== index));
    };

    const guardarDespiece = (e: React.FormEvent) => {
        e.preventDefault();
        const detallesValidos = detallesDespiece
            .filter((d) => d.producto_id && parseFloat(d.libras_obtenidas) > 0)
            .map((d) => ({
                producto_id: Number(d.producto_id),
                libras_obtenidas: parseFloat(d.libras_obtenidas),
            }));

        if (!compraId || parseFloat(pesoBrutoUsado) <= 0 || detallesValidos.length === 0) {
            toast.warning('Completa la compra, el peso bruto y al menos un corte obtenido');
            return;
        }

        setGuardando(true);
        router.post(
            '/inventario/despieces',
            {
                compra_id: Number(compraId),
                pieza_origen: piezaOrigen,
                peso_bruto_usado_libras: parseFloat(pesoBrutoUsado),
                detalles: detallesValidos,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Despiece registrado y costos reales recalculados');
                    setPesoBrutoUsado('');
                    setDetallesDespiece([{ producto_id: '', libras_obtenidas: '' }]);
                },
                onError: (errs) =>
                    toast.error(Object.values(errs)[0] || 'Error al registrar despiece'),
                onFinish: () => setGuardando(false),
            }
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inventario y Despiece | Carnicería" />
            <Toaster position="top-center" richColors />

            <div translate="no" className="min-h-[calc(100vh-4rem)] bg-[#FDF8F3] p-4 sm:p-6">
                {/* CABECERA Y KPIs */}
                <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-[#F9BF8F]/60 bg-white p-4 shadow-[0_4px_20px_-6px_rgba(52,34,46,0.08)] lg:flex-row lg:items-center">
                    <div className="flex items-center gap-3.5">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#34222E] text-[#F9BF8F] shadow-sm">
                            <Scissors className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tight text-[#34222E]">
                                Inventario, Cámara y Despiece
                            </h1>
                            <p className="text-xs font-medium text-[#34222E]/65">
                                Control de merma, costos reales por libra y precios de vitrina
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5 sm:flex sm:items-center">
                        <div className="rounded-xl border border-sky-200/80 bg-sky-50/70 px-3.5 py-2">
                            <span className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-sky-800/75 uppercase">
                                <Snowflake className="h-3 w-3 text-sky-600" />
                                Cámara Bruto
                            </span>
                            <strong className="text-base font-black tabular-nums text-[#34222E] sm:text-lg">
                                {brutoTotalCamara.toFixed(2)} lb
                            </strong>
                        </div>

                        <div className="rounded-xl border border-[#F9BF8F]/70 bg-[#FEE9D6]/45 px-3.5 py-2">
                            <span className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-[#34222E]/65 uppercase">
                                <Beef className="h-3 w-3 text-[#E2424A]" />
                                Vitrina Limpia
                            </span>
                            <strong className="text-base font-black tabular-nums text-[#34222E] sm:text-lg">
                                {limpioTotalVitrina.toFixed(2)} lb
                            </strong>
                        </div>

                        <div
                            className={`rounded-xl border px-3.5 py-2 ${
                                alertasStock > 0
                                    ? 'border-amber-200 bg-amber-50/80'
                                    : 'border-emerald-200 bg-emerald-50/70'
                            }`}
                        >
                            <span className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-[#34222E]/65 uppercase">
                                <AlertTriangle
                                    className={`h-3 w-3 ${
                                        alertasStock > 0 ? 'text-amber-600' : 'text-emerald-600'
                                    }`}
                                />
                                Stock Bajo
                            </span>
                            <strong className="text-base font-black tabular-nums text-[#34222E] sm:text-lg">
                                {alertasStock} {alertasStock === 1 ? 'corte' : 'cortes'}
                            </strong>
                        </div>
                    </div>
                </div>

                {/* PESTAÑAS DE NAVEGACIÓN INTERNA */}
                <div className="mb-6 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setTab('vitrina')}
                        className={`inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-xs font-extrabold transition sm:text-sm ${
                            tab === 'vitrina'
                                ? 'bg-[#34222E] text-white shadow-sm'
                                : 'border border-[#F9BF8F]/80 bg-white text-[#34222E] hover:bg-[#FEE9D6]/50'
                        }`}
                    >
                        <Layers className="h-4 w-4 text-[#F9BF8F]" />
                        <span>Vitrina y Precios ({productos.length})</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setTab('despiece')}
                        className={`inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-xs font-extrabold transition sm:text-sm ${
                            tab === 'despiece'
                                ? 'bg-[#34222E] text-white shadow-sm'
                                : 'border border-[#F9BF8F]/80 bg-white text-[#34222E] hover:bg-[#FEE9D6]/50'
                        }`}
                    >
                        <Scissors className="h-4 w-4 text-[#F9BF8F]" />
                        <span>Despiece y Merma</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setTab('camara')}
                        className={`inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-xs font-extrabold transition sm:text-sm ${
                            tab === 'camara'
                                ? 'bg-[#34222E] text-white shadow-sm'
                                : 'border border-[#F9BF8F]/80 bg-white text-[#34222E] hover:bg-[#FEE9D6]/50'
                        }`}
                    >
                        <PackagePlus className="h-4 w-4 text-[#F9BF8F]" />
                        <span>Compras en Cámara ({comprasCamara.length})</span>
                    </button>
                </div>

                {/* =================================================================
                    TAB 1: VITRINA, COSTO REAL Y EDICIÓN DE PRECIOS
                   ================================================================= */}
                {tab === 'vitrina' && (
                    <div className="space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="relative w-full sm:w-80">
                                <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#34222E]/45" />
                                <input
                                    type="text"
                                    value={busquedaCorte}
                                    onChange={(e) => setBusquedaCorte(e.target.value)}
                                    placeholder="Filtrar corte en vitrina..."
                                    className="h-11 w-full rounded-2xl border border-[#F9BF8F]/80 bg-white pr-4 pl-10 text-sm font-medium text-[#34222E] focus:border-[#E2424A] focus:outline-none"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={() => setMostrarNuevoCorte(!mostrarNuevoCorte)}
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#E2424A] to-[#C8323A] px-5 text-sm font-black text-white shadow-[0_6px_18px_-4px_rgba(226,66,74,0.5)] transition hover:brightness-105"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Nuevo Corte</span>
                            </button>
                        </div>

                        {/* Formulario plegable Nuevo Corte */}
                        {mostrarNuevoCorte && (
                            <form
                                onSubmit={crearCorte}
                                className="grid grid-cols-1 gap-3 rounded-3xl border-2 border-[#E2424A]/40 bg-white p-5 shadow-sm sm:grid-cols-5"
                            >
                                <div className="sm:col-span-2">
                                    <label className="mb-1 block text-xs font-extrabold text-[#34222E]/75 uppercase">
                                        Nombre del corte
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={nuevoCorte.nombre}
                                        onChange={(e) =>
                                            setNuevoCorte({ ...nuevoCorte, nombre: e.target.value })
                                        }
                                        placeholder="Ej. Longaniza artesanal"
                                        className="w-full rounded-xl border border-[#F9BF8F] bg-[#FDF8F3] px-3.5 py-2.5 text-sm font-semibold focus:border-[#E2424A] focus:bg-white focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-extrabold text-[#34222E]/75 uppercase">
                                        Precio venta ($/lb)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        required
                                        value={nuevoCorte.precio_venta_libra}
                                        onChange={(e) =>
                                            setNuevoCorte({
                                                ...nuevoCorte,
                                                precio_venta_libra: e.target.value,
                                            })
                                        }
                                        placeholder="3.50"
                                        className="w-full rounded-xl border border-[#F9BF8F] bg-[#FDF8F3] px-3.5 py-2.5 text-sm font-bold tabular-nums focus:border-[#E2424A] focus:bg-white focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-extrabold text-[#34222E]/75 uppercase">
                                        Stock inicial (lb)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        value={nuevoCorte.stock_libras}
                                        onChange={(e) =>
                                            setNuevoCorte({
                                                ...nuevoCorte,
                                                stock_libras: e.target.value,
                                            })
                                        }
                                        className="w-full rounded-xl border border-[#F9BF8F] bg-[#FDF8F3] px-3.5 py-2.5 text-sm font-bold tabular-nums focus:border-[#E2424A] focus:bg-white focus:outline-none"
                                    />
                                </div>

                                <div className="flex items-end gap-2">
                                    <button
                                        type="submit"
                                        disabled={guardando}
                                        className="h-10.5 flex-1 rounded-xl bg-[#34222E] text-sm font-black text-white transition hover:bg-[#493041]"
                                    >
                                        Guardar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMostrarNuevoCorte(false)}
                                        className="flex h-10.5 w-10.5 items-center justify-center rounded-xl border border-[#F9BF8F] text-[#34222E] hover:bg-[#FEE9D6]"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Tabla de Productos */}
                        <div className="overflow-x-auto rounded-3xl border border-[#F9BF8F]/75 bg-white shadow-[0_4px_20px_-6px_rgba(52,34,46,0.08)]">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-[#34222E] text-xs tracking-wider text-[#FEE9D6] uppercase">
                                    <tr>
                                        <th className="px-5 py-4">Corte</th>
                                        <th className="px-4 py-4">Stock Vitrina</th>
                                        <th className="px-4 py-4">Costo Real/lb</th>
                                        <th className="px-4 py-4">Precio Venta/lb</th>
                                        <th className="px-4 py-4">Ganancia/lb</th>
                                        <th className="px-4 py-4">Mínimo</th>
                                        <th className="px-5 py-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#FEE9D6]">
                                    {productosFiltrados.map((p) => {
                                        const esEdicion = editandoId === p.id;
                                        const stock = Number(p.stock_libras);
                                        const minimo = Number(p.stock_minimo_libras);
                                        const costo = Number(p.costo_actual_libra);
                                        const venta = Number(p.precio_venta_libra);
                                        const gananciaLb = venta - costo;
                                        const stockBajo = p.activo && stock <= minimo;

                                        return (
                                            <tr
                                                key={p.id}
                                                className={
                                                    !p.activo
                                                        ? 'bg-stone-50 opacity-55'
                                                        : 'transition-colors hover:bg-[#FEE9D6]/25'
                                                }
                                            >
                                                <td className="px-5 py-3.5 font-extrabold text-[#34222E]">
                                                    {esEdicion ? (
                                                        <input
                                                            type="text"
                                                            value={formEdit.nombre}
                                                            onChange={(e) =>
                                                                setFormEdit({
                                                                    ...formEdit,
                                                                    nombre: e.target.value,
                                                                })
                                                            }
                                                            className="w-44 rounded-xl border border-[#F9BF8F] bg-[#FDF8F3] px-3 py-1.5 text-sm font-bold"
                                                        />
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <span>{p.nombre}</span>
                                                            {!p.activo && (
                                                                <span className="rounded-md bg-stone-200 px-2 py-0.5 text-[10px] font-bold text-stone-600 uppercase">
                                                                    Pausado
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="px-4 py-3.5 tabular-nums">
                                                    <span
                                                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold ${
                                                            stockBajo
                                                                ? 'bg-amber-100 text-amber-800'
                                                                : 'bg-emerald-100 text-emerald-800'
                                                        }`}
                                                    >
                                                        {stockBajo && (
                                                            <AlertTriangle className="h-3 w-3" />
                                                        )}
                                                        <span>{stock.toFixed(2)} lb</span>
                                                    </span>
                                                </td>

                                                <td className="px-4 py-3.5 font-semibold tabular-nums text-[#34222E]/70">
                                                    ${costo.toFixed(2)}
                                                </td>

                                                <td className="px-4 py-3.5 font-black tabular-nums text-[#E2424A]">
                                                    {esEdicion ? (
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={formEdit.precio_venta_libra}
                                                            onChange={(e) =>
                                                                setFormEdit({
                                                                    ...formEdit,
                                                                    precio_venta_libra: e.target.value,
                                                                })
                                                            }
                                                            className="w-24 rounded-xl border border-[#F9BF8F] bg-[#FDF8F3] px-2.5 py-1.5 text-sm font-black text-[#34222E]"
                                                        />
                                                    ) : (
                                                        `$${venta.toFixed(2)}`
                                                    )}
                                                </td>

                                                <td className="px-4 py-3.5 tabular-nums">
                                                    <span className="inline-flex items-center gap-1 font-extrabold text-emerald-700">
                                                        <TrendingUp className="h-3.5 w-3.5" />
                                                        <span>
                                                            {costo > 0
                                                                ? `$${gananciaLb.toFixed(2)}`
                                                                : 'Sin despiece'}
                                                        </span>
                                                    </span>
                                                </td>

                                                <td className="px-4 py-3.5 text-xs font-semibold tabular-nums text-[#34222E]/75">
                                                    {esEdicion ? (
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={formEdit.stock_minimo_libras}
                                                            onChange={(e) =>
                                                                setFormEdit({
                                                                    ...formEdit,
                                                                    stock_minimo_libras:
                                                                        e.target.value,
                                                                })
                                                            }
                                                            className="w-20 rounded-xl border border-[#F9BF8F] bg-[#FDF8F3] px-2.5 py-1.5 text-sm font-bold"
                                                        />
                                                    ) : (
                                                        `${minimo.toFixed(2)} lb`
                                                    )}
                                                </td>

                                                <td className="px-5 py-3.5 text-right">
                                                    {esEdicion ? (
                                                        <div className="inline-flex items-center gap-1.5">
                                                            <label className="mr-2 inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-[#34222E]">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={formEdit.activo}
                                                                    onChange={(e) =>
                                                                        setFormEdit({
                                                                            ...formEdit,
                                                                            activo: e.target.checked,
                                                                        })
                                                                    }
                                                                    className="rounded border-[#F9BF8F] text-[#E2424A]"
                                                                />
                                                                <span>Activo</span>
                                                            </label>
                                                            <button
                                                                type="button"
                                                                disabled={guardando}
                                                                onClick={() => guardarEdicion(p.id)}
                                                                className="rounded-xl bg-emerald-600 p-2 text-white shadow-xs hover:bg-emerald-700"
                                                                title="Guardar cambios"
                                                            >
                                                                <Check className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditandoId(null)}
                                                                className="rounded-xl bg-stone-200 p-2 text-stone-700 hover:bg-stone-300"
                                                                title="Cancelar"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => iniciarEdicion(p)}
                                                            className="inline-flex items-center gap-1.5 rounded-xl border border-[#F9BF8F] bg-white px-3 py-1.5 text-xs font-extrabold text-[#34222E] transition hover:border-[#E2424A] hover:bg-[#FEE9D6]/50"
                                                        >
                                                            <Edit3 className="h-3.5 w-3.5 text-[#E2424A]" />
                                                            <span>Editar</span>
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* =================================================================
                    TAB 2: DESPIECE PARCIAL Y CÁLCULO DE MERMA
                   ================================================================= */}
                {tab === 'despiece' && (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <form
                            onSubmit={guardarDespiece}
                            className="space-y-4 rounded-3xl border border-[#F9BF8F]/80 bg-white p-6 shadow-[0_4px_20px_-6px_rgba(52,34,46,0.08)] lg:col-span-7"
                        >
                            <h2 className="flex items-center gap-2 text-lg font-black text-[#34222E]">
                                <Scissors className="h-5 w-5 text-[#E2424A]" />
                                <span>Registrar Despiece Parcial</span>
                            </h2>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div className="sm:col-span-2">
                                    <label className="mb-1.5 block text-xs font-extrabold text-[#34222E]/70 uppercase">
                                        Compra en cámara
                                    </label>
                                    <select
                                        value={compraId}
                                        onChange={(e) => setCompraId(e.target.value)}
                                        required
                                        className="h-11 w-full rounded-2xl border border-[#F9BF8F] bg-[#FDF8F3] px-3.5 text-sm font-semibold focus:border-[#E2424A] focus:bg-white focus:outline-none"
                                    >
                                        <option value="">Selecciona compra con saldo...</option>
                                        {comprasConSaldo.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                #{c.id} {c.descripcion} (Disp:{' '}
                                                {Number(c.peso_disponible_bruto_libras).toFixed(2)} lb ·
                                                Base: ${Number(c.costo_base_libra).toFixed(2)}/lb)
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-extrabold text-[#34222E]/70 uppercase">
                                        Pieza origen
                                    </label>
                                    <select
                                        value={piezaOrigen}
                                        onChange={(e) => setPiezaOrigen(e.target.value)}
                                        className="h-11 w-full rounded-2xl border border-[#F9BF8F] bg-[#FDF8F3] px-3.5 text-sm font-semibold capitalize focus:border-[#E2424A] focus:bg-white focus:outline-none"
                                    >
                                        {['pierna', 'brazo', 'lomo', 'costilla', 'mixto'].map((pz) => (
                                            <option key={pz} value={pz}>
                                                {pz}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-extrabold text-[#34222E]/70 uppercase">
                                    Libras brutas sacadas de cámara
                                </label>
                                <div className="relative">
                                    <Scale className="pointer-events-none absolute top-1/2 left-4 h-4.5 w-4.5 -translate-y-1/2 text-[#34222E]/45" />
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        required
                                        value={pesoBrutoUsado}
                                        onChange={(e) => setPesoBrutoUsado(e.target.value)}
                                        placeholder="Ej. 35.50"
                                        className="h-12 w-full rounded-2xl border border-[#F9BF8F] bg-[#FDF8F3] pr-4 pl-11 text-base font-black tabular-nums focus:border-[#E2424A] focus:bg-white focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Cortes limpios obtenidos */}
                            <div className="space-y-2.5 border-t border-[#FEE9D6] pt-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-extrabold text-[#34222E]/70 uppercase">
                                        Cortes limpios obtenidos (entran a vitrina)
                                    </span>
                                    <button
                                        type="button"
                                        onClick={agregarFilaCorte}
                                        className="inline-flex items-center gap-1 rounded-xl bg-[#FEE9D6] px-3 py-1.5 text-xs font-extrabold text-[#34222E] transition hover:bg-[#F9BF8F]/60"
                                    >
                                        <Plus className="h-3.5 w-3.5 text-[#E2424A]" />
                                        <span>Añadir corte</span>
                                    </button>
                                </div>

                                {detallesDespiece.map((fila, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <select
                                            value={fila.producto_id}
                                            onChange={(e) => {
                                                const copia = [...detallesDespiece];
                                                copia[index].producto_id = e.target.value;
                                                setDetallesDespiece(copia);
                                            }}
                                            required
                                            className="h-11 flex-1 rounded-2xl border border-[#F9BF8F] bg-[#FDF8F3] px-3.5 text-sm font-semibold focus:border-[#E2424A] focus:bg-white focus:outline-none"
                                        >
                                            <option value="">Selecciona corte...</option>
                                            {productos
                                                .filter((p) => p.activo)
                                                .map((p) => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.nombre}
                                                    </option>
                                                ))}
                                        </select>

                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            required
                                            value={fila.libras_obtenidas}
                                            onChange={(e) => {
                                                const copia = [...detallesDespiece];
                                                copia[index].libras_obtenidas = e.target.value;
                                                setDetallesDespiece(copia);
                                            }}
                                            placeholder="Libras (lb)"
                                            className="h-11 w-32 rounded-2xl border border-[#F9BF8F] bg-[#FDF8F3] px-3.5 text-sm font-black tabular-nums focus:border-[#E2424A] focus:bg-white focus:outline-none"
                                        />

                                        {detallesDespiece.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => quitarFilaCorte(index)}
                                                className="rounded-xl p-2.5 text-rose-500 hover:bg-rose-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Simulador de Rendimiento y Merma */}
                            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-gradient-to-r from-[#34222E] to-[#241720] p-4 text-center text-white">
                                <div>
                                    <span className="block text-[10px] font-bold text-[#F9BF8F] uppercase">
                                        Útil Limpio
                                    </span>
                                    <strong className="text-lg font-black tabular-nums">
                                        {simulacionDespiece.util} lb
                                    </strong>
                                </div>
                                <div className="border-x border-white/10">
                                    <span className="block text-[10px] font-bold text-[#F9BF8F] uppercase">
                                        Merma ({simulacionDespiece.porcentajeMerma}%)
                                    </span>
                                    <strong className="text-lg font-black tabular-nums text-amber-300">
                                        {simulacionDespiece.merma} lb
                                    </strong>
                                </div>
                                <div>
                                    <span className="block text-[10px] font-bold text-[#F9BF8F] uppercase">
                                        Costo Real/lb
                                    </span>
                                    <strong className="text-lg font-black tabular-nums text-[#E2424A]">
                                        ${simulacionDespiece.costoRealLibra.toFixed(2)}
                                    </strong>
                                </div>
                            </div>

                            {simulacionDespiece.excedeBruto && (
                                <p className="text-xs font-bold text-rose-600">
                                    ⚠️ El peso limpio obtenido supera las libras brutas sacadas de cámara.
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={guardando || simulacionDespiece.excedeBruto}
                                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#E2424A] to-[#C8323A] text-sm font-black text-white shadow-[0_8px_20px_-4px_rgba(226,66,74,0.5)] transition hover:brightness-105 disabled:opacity-45"
                            >
                                <Check className="h-4.5 w-4.5" />
                                <span>
                                    {guardando
                                        ? 'Guardando...'
                                        : 'Guardar Despiece y Actualizar Costos'}
                                </span>
                            </button>
                        </form>

                        {/* Historial de últimos despieces */}
                        <div className="space-y-3 lg:col-span-5">
                            <h3 className="text-xs font-extrabold tracking-wider text-[#34222E]/65 uppercase">
                                Últimos Despieces Registrados
                            </h3>
                            {despiecesRecientes.length === 0 ? (
                                <div className="rounded-3xl border-2 border-dashed border-[#F9BF8F] bg-white p-10 text-center text-sm font-medium text-[#34222E]/60">
                                    Aún no hay sesiones de despiece registradas.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {despiecesRecientes.map((d) => (
                                        <div
                                            key={d.id}
                                            className="rounded-2xl border border-[#F9BF8F]/80 bg-white p-4 shadow-xs"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-extrabold text-[#34222E]">
                                                    #{d.id} · {d.compra_descripcion}
                                                </span>
                                                <span className="rounded-full bg-[#FEE9D6] px-2.5 py-0.5 text-xs font-extrabold capitalize text-[#34222E]">
                                                    {d.pieza_origen}
                                                </span>
                                            </div>
                                            <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-[#FEE9D6] pt-2 text-xs tabular-nums text-[#34222E]/80">
                                                <div>
                                                    Bruto: <strong>{d.peso_bruto_usado_libras} lb</strong>
                                                </div>
                                                <div>
                                                    Merma: <strong>{d.merma_libras} lb</strong>
                                                </div>
                                                <div className="text-right font-black text-[#E2424A]">
                                                    Real: ${d.costo_real_libra_sesion}/lb
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* =================================================================
                    TAB 3: COMPRAS EN CÁMARA FRIGORÍFICA
                   ================================================================= */}
                {tab === 'camara' && (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <form
                            onSubmit={registrarCompra}
                            className="space-y-4 rounded-3xl border border-[#F9BF8F]/80 bg-white p-6 shadow-[0_4px_20px_-6px_rgba(52,34,46,0.08)] lg:col-span-5"
                        >
                            <h2 className="flex items-center gap-2 text-lg font-black text-[#34222E]">
                                <PackagePlus className="h-5 w-5 text-[#E2424A]" />
                                <span>Ingresar Compra a Cámara</span>
                            </h2>

                            <div>
                                <label className="mb-1.5 block text-xs font-extrabold text-[#34222E]/70 uppercase">
                                    Descripción / Proveedor
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formCompra.descripcion}
                                    onChange={(e) =>
                                        setFormCompra({ ...formCompra, descripcion: e.target.value })
                                    }
                                    placeholder="Ej. Medio chancho El Corral"
                                    className="h-11 w-full rounded-2xl border border-[#F9BF8F] bg-[#FDF8F3] px-3.5 text-sm font-semibold focus:border-[#E2424A] focus:bg-white focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1.5 block text-xs font-extrabold text-[#34222E]/70 uppercase">
                                        Peso bruto (lb)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        required
                                        value={formCompra.peso_inicial_libras}
                                        onChange={(e) =>
                                            setFormCompra({
                                                ...formCompra,
                                                peso_inicial_libras: e.target.value,
                                            })
                                        }
                                        placeholder="104.85"
                                        className="h-11 w-full rounded-2xl border border-[#F9BF8F] bg-[#FDF8F3] px-3.5 text-sm font-black tabular-nums focus:border-[#E2424A] focus:bg-white focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-extrabold text-[#34222E]/70 uppercase">
                                        Costo total ($)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        required
                                        value={formCompra.costo_total}
                                        onChange={(e) =>
                                            setFormCompra({
                                                ...formCompra,
                                                costo_total: e.target.value,
                                            })
                                        }
                                        placeholder="196.49"
                                        className="h-11 w-full rounded-2xl border border-[#F9BF8F] bg-[#FDF8F3] px-3.5 text-sm font-black tabular-nums focus:border-[#E2424A] focus:bg-white focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-extrabold text-[#34222E]/70 uppercase">
                                    Fecha de compra
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formCompra.fecha_compra}
                                    onChange={(e) =>
                                        setFormCompra({ ...formCompra, fecha_compra: e.target.value })
                                    }
                                    className="h-11 w-full rounded-2xl border border-[#F9BF8F] bg-[#FDF8F3] px-3.5 text-sm font-semibold focus:border-[#E2424A] focus:bg-white focus:outline-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={guardando}
                                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#E2424A] to-[#C8323A] text-sm font-black text-white shadow-[0_8px_20px_-4px_rgba(226,66,74,0.5)] transition hover:brightness-105"
                            >
                                <Plus className="h-4.5 w-4.5" />
                                <span>Registrar Ingreso Bruto</span>
                            </button>
                        </form>

                        <div className="overflow-x-auto rounded-3xl border border-[#F9BF8F]/75 bg-white shadow-[0_4px_20px_-6px_rgba(52,34,46,0.08)] lg:col-span-7">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-[#34222E] text-xs tracking-wider text-[#FEE9D6] uppercase">
                                    <tr>
                                        <th className="px-5 py-4">Compra</th>
                                        <th className="px-4 py-4">Inicial</th>
                                        <th className="px-4 py-4">Disp. Cámara</th>
                                        <th className="px-5 py-4">Costo Base</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#FEE9D6]">
                                    {comprasCamara.map((c) => (
                                        <tr key={c.id} className="hover:bg-[#FEE9D6]/20">
                                            <td className="px-5 py-3.5">
                                                <p className="font-extrabold text-[#34222E]">
                                                    #{c.id} · {c.descripcion}
                                                </p>
                                                <p className="text-xs text-[#34222E]/60 tabular-nums">
                                                    {c.fecha_compra} · Total: $
                                                    {Number(c.costo_total).toFixed(2)}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3.5 font-semibold tabular-nums">
                                                {Number(c.peso_inicial_libras).toFixed(2)} lb
                                            </td>
                                            <td className="px-4 py-3.5 tabular-nums">
                                                <span
                                                    className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${
                                                        Number(c.peso_disponible_bruto_libras) > 0
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : 'bg-stone-100 text-stone-500'
                                                    }`}
                                                >
                                                    {Number(c.peso_disponible_bruto_libras).toFixed(2)}{' '}
                                                    lb
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 font-black tabular-nums text-[#E2424A]">
                                                ${Number(c.costo_base_libra).toFixed(2)}/lb
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
