import React, { useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { Toaster, toast } from 'sonner';
import AppLayout from '@/layouts/app-layout';
import {
    AlertTriangle,
    Banknote,
    Beef,
    BookOpen,
    Calculator,
    CheckCircle2,
    Landmark,
    Plus,
    Scale,
    Search,
    ShoppingCart,
    SlidersHorizontal,
    Trash2,
    UserCheck,
    DollarSign ,
    X,
} from 'lucide-react';

interface Producto {
    id: number;
    nombre: string;
    precio_venta_libra: string | number;
    stock_libras: string | number;
    stock_minimo_libras: string | number;
}

interface ItemCarrito {
    producto_id: number;
    nombre: string;
    precio_libra: number;
    stock_disponible: number;
    peso_libras: number;
    monto_cobrado: number;
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
    productos: Producto[];
    clientesFrecuentes: string[];
    resumenHoy: ResumenHoy;
}

type ModoDespacho = 'libras' | 'precio' | 'ambos';
type MetodoPago = 'efectivo' | 'transferencia' | 'fiado';

export default function PosIndex({ productos, clientesFrecuentes, resumenHoy }: Props) {
    const { errors } = usePage().props as { errors: Record<string, string> };

    // Filtros de catálogo
    const [busqueda, setBusqueda] = useState('');
    const [soloDisponibles, setSoloDisponibles] = useState(true);

    // Estado del modal de despacho
    const [productoActivo, setProductoActivo] = useState<Producto | null>(null);
    const [modo, setModo] = useState<ModoDespacho>('libras');
    const [inputLibras, setInputLibras] = useState('');
    const [inputPrecio, setInputPrecio] = useState('');

    // Carrito y cobro
    const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
    const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
    const [clienteFiado, setClienteFiado] = useState('');
    const [efectivoRecibido, setEfectivoRecibido] = useState('');
    const [procesando, setProcesando] = useState(false);

    const productosFiltrados = useMemo(() => {
        return productos.filter((p) => {
            const coincideNombre = p.nombre.toLowerCase().includes(busqueda.toLowerCase().trim());
            const tieneStock = !soloDisponibles || Number(p.stock_libras) > 0;
            return coincideNombre && tieneStock;
        });
    }, [productos, busqueda, soloDisponibles]);

    const totalCobrar = useMemo(() => {
        return Number(
            carrito.reduce((acc, item) => acc + Number(item.monto_cobrado), 0).toFixed(2)
        );
    }, [carrito]);

    const totalLibrasCarrito = useMemo(() => {
        return Number(
            carrito.reduce((acc, item) => acc + Number(item.peso_libras), 0).toFixed(2)
        );
    }, [carrito]);

    const cambioDevolver = useMemo(() => {
        const recibido = parseFloat(efectivoRecibido);
        if (isNaN(recibido) || recibido <= totalCobrar) return 0;
        return Number((recibido - totalCobrar).toFixed(2));
    }, [efectivoRecibido, totalCobrar]);

    // Abrir modal al tocar un corte
    const abrirDespacho = (producto: Producto) => {
        if (Number(producto.stock_libras) <= 0) {
            toast.error(`No hay stock disponible de ${producto.nombre}`);
            return;
        }
        setProductoActivo(producto);
        setModo('libras');
        setInputLibras('');
        setInputPrecio('');
    };

    // Cálculo en tiempo real dentro del modal según los 3 modos
    const calculoModal = useMemo(() => {
        if (!productoActivo) return { libras: 0, monto: 0 };
        const precioUnitario = Math.max(0.01, Number(productoActivo.precio_venta_libra));

        if (modo === 'libras') {
            const lb = Math.max(0, parseFloat(inputLibras) || 0);
            return {
                libras: Number(lb.toFixed(2)),
                monto: Number((lb * precioUnitario).toFixed(2)),
            };
        }

        if (modo === 'precio') {
            const usd = Math.max(0, parseFloat(inputPrecio) || 0);
            const lb = usd > 0 ? Math.max(0.01, Number((usd / precioUnitario).toFixed(2))) : 0;
            return {
                libras: lb,
                monto: Number(usd.toFixed(2)),
            };
        }

        // Modo 'ambos' (Peso y Precio manuales)
        return {
            libras: Number((Math.max(0, parseFloat(inputLibras) || 0)).toFixed(2)),
            monto: Number((Math.max(0, parseFloat(inputPrecio) || 0)).toFixed(2)),
        };
    }, [productoActivo, modo, inputLibras, inputPrecio]);

    const agregarAlCarrito = (e: React.FormEvent) => {
        e.preventDefault();
        if (!productoActivo) return;

        const { libras, monto } = calculoModal;
        const stockMax = Number(productoActivo.stock_libras);

        if (libras <= 0 || monto <= 0) {
            toast.warning('Ingresa un peso o monto mayor a 0');
            return;
        }

        const existente = carrito.find((i) => i.producto_id === productoActivo.id);
        const librasAcumuladas = Number(((existente?.peso_libras || 0) + libras).toFixed(2));

        if (librasAcumuladas > stockMax) {
            toast.error(`Stock insuficiente: solo quedan ${stockMax} lb de ${productoActivo.nombre}`);
            return;
        }

        setCarrito((prev) => {
            if (existente) {
                return prev.map((item) =>
                    item.producto_id === productoActivo.id
                        ? {
                              ...item,
                              peso_libras: librasAcumuladas,
                              monto_cobrado: Number((item.monto_cobrado + monto).toFixed(2)),
                          }
                        : item
                );
            }

            return [
                ...prev,
                {
                    producto_id: productoActivo.id,
                    nombre: productoActivo.nombre,
                    precio_libra: Number(productoActivo.precio_venta_libra),
                    stock_disponible: stockMax,
                    peso_libras: libras,
                    monto_cobrado: monto,
                },
            ];
        });

        toast.success(`${productoActivo.nombre} (${libras} lb) agregado`);
        setProductoActivo(null);
    };

    const eliminarItem = (productoId: number) => {
        setCarrito((prev) => prev.filter((item) => item.producto_id !== productoId));
    };

    const registrarVenta = () => {
        if (carrito.length === 0) {
            toast.warning('El ticket está vacío');
            return;
        }

        if (metodoPago === 'fiado' && clienteFiado.trim().length < 2) {
            toast.warning('Escribe el nombre del cliente para registrar el fiado');
            return;
        }

        setProcesando(true);

        router.post(
            '/pos/ventas',
            {
                cliente: metodoPago === 'fiado' ? clienteFiado.trim() : null,
                metodo_pago: metodoPago,
                origen: 'web',
                detalles: carrito.map((item) => ({
                    producto_id: item.producto_id,
                    peso_libras: item.peso_libras,
                    monto_cobrado: item.monto_cobrado,
                })),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(`¡Venta registrada por $${totalCobrar.toFixed(2)}!`);
                    setCarrito([]);
                    setClienteFiado('');
                    setEfectivoRecibido('');
                    setMetodoPago('efectivo');
                },
                onError: (errs) => {
                    const primerError = Object.values(errs)[0] || 'Revisa los datos de la venta';
                    toast.error(primerError);
                },
                onFinish: () => setProcesando(false),
            }
        );
    };

    return (
        <AppLayout>
        <div translate="no" className="min-h-screen bg-[#FEE9D6]/45 text-[#34222E]">
            <Head title="Punto de Venta | Carnicería" />
            <Toaster position="top-center" richColors />

            {/* BARRA SUPERIOR */}
            <header className="bg-[#34222E] text-[#FEE9D6] shadow-md">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E2424A] text-white shadow">
                            <Beef className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight text-white">
                                Mostrador POS
                            </h1>
                            <p className="text-xs text-[#F9BF8F]">
                                Despacho rápido por libra, precio o romana libre
                            </p>
                        </div>
                    </div>

                    {/* KPIs rápidos del día */}
                    <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                        <div className="rounded-xl bg-white/10 px-3.5 py-1.5">
                            <span className="text-[#F9BF8F]">Caja Hoy: </span>
                            <strong className="font-bold text-white">
                                ${Number(resumenHoy.efectivo_real_caja).toFixed(2)}
                            </strong>
                        </div>
                        <div className="rounded-xl bg-white/10 px-3.5 py-1.5">
                            <span className="text-[#F9BF8F]">Tickets: </span>
                            <strong className="font-bold text-white">
                                {resumenHoy.total_tickets}
                            </strong>
                        </div>
                        <div className="hidden rounded-xl bg-[#E2424A]/20 px-3.5 py-1.5 text-[#F9BF8F] md:block">
                            <span>Por cobrar: </span>
                            <strong className="font-bold text-white">
                                ${Number(resumenHoy.cartera_por_cobrar).toFixed(2)}
                            </strong>
                        </div>
                    </div>
                </div>
            </header>

            {/* CONTENIDO PRINCIPAL: CATÁLOGO + TICKET */}
            <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-12">
                {/* COLUMNA IZQUIERDA: CORTES DISPONIBLES (7 cols) */}
                <section className="space-y-4 lg:col-span-7">
                    {/* Buscador y filtro */}
                    <div className="flex flex-col gap-3 rounded-2xl border border-[#F9BF8F]/60 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#34222E]/50" />
                            <input
                                type="text"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                placeholder="Buscar corte (chuleta, lomo, costilla...)"
                                className="w-full rounded-xl border border-[#F9BF8F] bg-[#FEE9D6]/25 py-2.5 pr-4 pl-10 text-sm text-[#34222E] placeholder-[#34222E]/45 focus:border-[#E2424A] focus:bg-white focus:outline-none"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={() => setSoloDisponibles(!soloDisponibles)}
                            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
                                soloDisponibles
                                    ? 'bg-[#34222E] text-[#FEE9D6]'
                                    : 'border border-[#F9BF8F] bg-white text-[#34222E]'
                            }`}
                        >
                            <CheckCircle2 className="h-4 w-4 text-[#F9BF8F]" />
                            <span>{soloDisponibles ? 'Con stock en vitrina' : 'Ver todos'}</span>
                        </button>
                    </div>

                    {/* Grid de Tarjetas de Cortes */}
                    {productosFiltrados.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[#F9BF8F] bg-white p-10 text-center">
                            <Beef className="mx-auto mb-2 h-10 w-10 text-[#E2424A]/50" />
                            <p className="font-semibold text-[#34222E]">No se encontraron cortes</p>
                            <p className="text-sm text-[#34222E]/60">
                                Prueba otro nombre o activa "Ver todos" para revisar cortes agotados.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
                            {productosFiltrados.map((producto) => {
                                const stock = Number(producto.stock_libras);
                                const minimo = Number(producto.stock_minimo_libras);
                                const agotado = stock <= 0;
                                const stockBajo = !agotado && stock <= minimo;

                                return (
                                    <button
                                        key={producto.id}
                                        type="button"
                                        disabled={agotado}
                                        onClick={() => abrirDespacho(producto)}
                                        className={`group relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
                                            agotado
                                                ? 'cursor-not-allowed border-gray-200 bg-gray-100/80 opacity-60'
                                                : 'border-[#F9BF8F]/80 bg-white shadow-sm hover:-translate-y-0.5 hover:border-[#E2424A] hover:shadow-md active:scale-[0.99]'
                                        }`}
                                    >
                                        <div>
                                            <div className="mb-2 flex items-start justify-between gap-2">
                                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#FEE9D6] text-[#E2424A] transition group-hover:bg-[#E2424A] group-hover:text-white">
                                                    <Beef className="h-5 w-5" />
                                                </span>

                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                                        agotado
                                                            ? 'bg-gray-200 text-gray-600'
                                                            : stockBajo
                                                            ? 'bg-amber-100 text-amber-800'
                                                            : 'bg-emerald-100 text-emerald-800'
                                                    }`}
                                                >
                                                    {stockBajo && (
                                                        <AlertTriangle className="h-3 w-3" />
                                                    )}
                                                    <span>{stock.toFixed(2)} lb</span>
                                                </span>
                                            </div>

                                            <h2 className="line-clamp-2 text-base font-bold text-[#34222E]">
                                                {producto.nombre}
                                            </h2>
                                        </div>

                                        <div className="mt-4 flex items-baseline justify-between border-t border-[#FEE9D6] pt-2.5">
                                            <span className="text-xl font-extrabold text-[#E2424A]">
                                                ${Number(producto.precio_venta_libra).toFixed(2)}
                                                <span className="text-xs font-normal text-[#34222E]/60">
                                                    /lb
                                                </span>
                                            </span>

                                            {!agotado && (
                                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#34222E] text-white transition group-hover:bg-[#E2424A]">
                                                    <Plus className="h-4 w-4" />
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* COLUMNA DERECHA: TICKET / CARRITO DE COBRO (5 cols) */}
                <aside className="lg:col-span-5">
                    <div className="sticky top-6 overflow-hidden rounded-2xl border border-[#F9BF8F] bg-white shadow-lg">
                        {/* Encabezado Ticket */}
                        <div className="flex items-center justify-between bg-[#34222E] px-5 py-4 text-white">
                            <div className="flex items-center gap-2.5">
                                <ShoppingCart className="h-5 w-5 text-[#F9BF8F]" />
                                <h2 className="font-bold">Ticket Actual</h2>
                            </div>
                            <span className="rounded-full bg-[#E2424A] px-3 py-0.5 text-xs font-bold">
                                {carrito.length} {carrito.length === 1 ? 'corte' : 'cortes'} ·{' '}
                                {totalLibrasCarrito} lb
                            </span>
                        </div>

                        {/* Lista de productos agregados */}
                        <div className="max-h-72 divide-y divide-[#FEE9D6] overflow-y-auto px-5 py-2">
                            {carrito.length === 0 ? (
                                <div className="py-10 text-center text-sm text-[#34222E]/50">
                                    Toca un corte a la izquierda para pesarlo y agregarlo al despacho.
                                </div>
                            ) : (
                                carrito.map((item) => (
                                    <div
                                        key={item.producto_id}
                                        className="flex items-center justify-between gap-3 py-3"
                                    >
                                        <div>
                                            <p className="font-bold text-[#34222E]">{item.nombre}</p>
                                            <p className="text-xs text-[#34222E]/70">
                                                <span className="font-semibold text-[#34222E]">
                                                    {item.peso_libras.toFixed(2)} lb
                                                </span>{' '}
                                                × ${item.precio_libra.toFixed(2)}/lb
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <span className="text-base font-extrabold text-[#34222E]">
                                                ${item.monto_cobrado.toFixed(2)}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => eliminarItem(item.producto_id)}
                                                className="rounded-lg p-1.5 text-red-500 transition hover:bg-red-50"
                                                title="Quitar corte"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Total y Métodos de Pago */}
                        <div className="space-y-4 border-t border-[#F9BF8F]/60 bg-[#FEE9D6]/30 p-5">
                            <div className="flex items-baseline justify-between">
                                <span className="text-sm font-semibold text-[#34222E]/80">
                                    TOTAL A COBRAR
                                </span>
                                <span className="text-3xl font-black text-[#34222E]">
                                    ${totalCobrar.toFixed(2)}
                                </span>
                            </div>

                            {/* Selector de Método de Pago */}
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setMetodoPago('efectivo')}
                                    className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-2.5 text-xs font-bold transition ${
                                        metodoPago === 'efectivo'
                                            ? 'border-[#34222E] bg-[#34222E] text-white shadow-sm'
                                            : 'border-[#F9BF8F] bg-white text-[#34222E] hover:bg-[#FEE9D6]/50'
                                    }`}
                                >
                                    <Banknote className="h-4 w-4 text-[#F9BF8F]" />
                                    <span>Efectivo</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setMetodoPago('transferencia')}
                                    className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-2.5 text-xs font-bold transition ${
                                        metodoPago === 'transferencia'
                                            ? 'border-[#34222E] bg-[#34222E] text-white shadow-sm'
                                            : 'border-[#F9BF8F] bg-white text-[#34222E] hover:bg-[#FEE9D6]/50'
                                    }`}
                                >
                                    <Landmark className="h-4 w-4 text-[#F9BF8F]" />
                                    <span>Transferencia</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setMetodoPago('fiado')}
                                    className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-2.5 text-xs font-bold transition ${
                                        metodoPago === 'fiado'
                                            ? 'border-[#34222E] bg-[#34222E] text-white shadow-sm'
                                            : 'border-[#F9BF8F] bg-white text-[#34222E] hover:bg-[#FEE9D6]/50'
                                    }`}
                                >
                                    <BookOpen className="h-4 w-4 text-[#F9BF8F]" />
                                    <span>Fiado</span>
                                </button>
                            </div>

                            {/* Calculadora rápida de cambio (solo en Efectivo) */}
                            {metodoPago === 'efectivo' && totalCobrar > 0 && (
                                <div className="flex items-center justify-between gap-3 rounded-xl border border-[#F9BF8F] bg-white px-3.5 py-2.5">
                                    <div className="flex items-center gap-2">
                                        <Calculator className="h-4 w-4 text-[#E2424A]" />
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={efectivoRecibido}
                                            onChange={(e) => setEfectivoRecibido(e.target.value)}
                                            placeholder="Paga con ($)"
                                            className="w-28 border-b border-[#F9BF8F] bg-transparent text-sm font-bold text-[#34222E] focus:border-[#E2424A] focus:outline-none"
                                        />
                                    </div>
                                    <div className="text-right text-xs">
                                        <span className="text-[#34222E]/60">Cambio: </span>
                                        <strong className="text-sm font-extrabold text-emerald-700">
                                            ${cambioDevolver.toFixed(2)}
                                        </strong>
                                    </div>
                                </div>
                            )}

                            {/* Nombre del cliente (solo en Fiado) */}
                            {metodoPago === 'fiado' && (
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-1.5 text-xs font-bold text-[#34222E]">
                                        <UserCheck className="h-4 w-4 text-[#E2424A]" />
                                        <span>Cliente a fiar:</span>
                                    </label>
                                    <input
                                        type="text"
                                        list="lista-clientes-fiados"
                                        value={clienteFiado}
                                        onChange={(e) => setClienteFiado(e.target.value)}
                                        placeholder="Ej. Doña Rosa, Don Pedro..."
                                        className="w-full rounded-xl border border-[#F9BF8F] bg-white px-3.5 py-2 text-sm text-[#34222E] focus:border-[#E2424A] focus:outline-none"
                                    />
                                    <datalist id="lista-clientes-fiados">
                                        {clientesFrecuentes.map((nombre) => (
                                            <option key={nombre} value={nombre} />
                                        ))}
                                    </datalist>
                                    {errors.cliente && (
                                        <p className="text-xs text-red-600">{errors.cliente}</p>
                                    )}
                                </div>
                            )}

                            {/* Botón Principal de Cobro */}
                            <button
                                type="button"
                                disabled={procesando || carrito.length === 0}
                                onClick={registrarVenta}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E2424A] py-3.5 text-base font-extrabold text-white shadow-md transition hover:bg-[#c9353c] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <CheckCircle2 className="h-5 w-5" />
                                <span>
                                    {procesando
                                        ? 'Registrando...'
                                        : `Confirmar Venta · $${totalCobrar.toFixed(2)}`}
                                </span>
                            </button>
                        </div>
                    </div>
                </aside>
            </main>

            {/* MODAL DE DESPACHO (3 MODOS: LIBRAS / PRECIO / PESO + PRECIO) */}
            {productoActivo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#34222E]/70 p-4 backdrop-blur-xs">
                    <form
                        onSubmit={agregarAlCarrito}
                        className="w-full max-w-md overflow-hidden rounded-2xl border border-[#F9BF8F] bg-white shadow-2xl"
                    >
                        <div className="flex items-center justify-between bg-[#34222E] px-5 py-4 text-white">
                            <div>
                                <h3 className="text-lg font-bold">{productoActivo.nombre}</h3>
                                <p className="text-xs text-[#F9BF8F]">
                                    ${Number(productoActivo.precio_venta_libra).toFixed(2)}/lb ·
                                    Disponible: {Number(productoActivo.stock_libras).toFixed(2)} lb
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setProductoActivo(null)}
                                className="rounded-lg p-1 text-[#FEE9D6] hover:bg-white/10"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4 p-5">
                            {/* Selector de los 3 Modos */}
                            <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#FEE9D6]/60 p-1.5">
                                <button
                                    type="button"
                                    onClick={() => setModo('libras')}
                                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                                        modo === 'libras'
                                            ? 'bg-[#34222E] text-white shadow'
                                            : 'text-[#34222E] hover:bg-white/60'
                                    }`}
                                >
                                    <Scale className="h-3.5 w-3.5 text-[#F9BF8F]" />
                                    <span>Por Libras</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setModo('precio')}
                                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                                        modo === 'precio'
                                            ? 'bg-[#34222E] text-white shadow'
                                            : 'text-[#34222E] hover:bg-white/60'
                                    }`}
                                >
                                    <DollarSign className="h-3.5 w-3.5 text-[#F9BF8F]" />
                                    <span>Por Precio</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setModo('ambos')}
                                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                                        modo === 'ambos'
                                            ? 'bg-[#34222E] text-white shadow'
                                            : 'text-[#34222E] hover:bg-white/60'
                                    }`}
                                >
                                    <SlidersHorizontal className="h-3.5 w-3.5 text-[#F9BF8F]" />
                                    <span>Peso + $</span>
                                </button>
                            </div>

                            {/* Inputs según modo */}
                            {modo === 'libras' && (
                                <div className="space-y-2.5">
                                    <label className="block text-xs font-bold uppercase text-[#34222E]/70">
                                        Peso de la romana (lb)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        autoFocus
                                        value={inputLibras}
                                        onChange={(e) => setInputLibras(e.target.value)}
                                        placeholder="Ej. 2.70"
                                        className="w-full rounded-xl border-2 border-[#F9BF8F] px-4 py-3 text-2xl font-extrabold text-[#34222E] focus:border-[#E2424A] focus:outline-none"
                                    />
                                    <div className="flex flex-wrap gap-2">
                                        {['0.5', '1', '2', '3', '5'].map((preset) => (
                                            <button
                                                key={preset}
                                                type="button"
                                                onClick={() => setInputLibras(preset)}
                                                className="rounded-lg border border-[#F9BF8F] bg-[#FEE9D6]/40 px-3 py-1 text-xs font-bold text-[#34222E] hover:bg-[#F9BF8F]/40"
                                            >
                                                {preset} lb
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {modo === 'precio' && (
                                <div className="space-y-2.5">
                                    <label className="block text-xs font-bold uppercase text-[#34222E]/70">
                                        Monto pedido por el cliente ($)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        autoFocus
                                        value={inputPrecio}
                                        onChange={(e) => setInputPrecio(e.target.value)}
                                        placeholder="Ej. 5.00"
                                        className="w-full rounded-xl border-2 border-[#F9BF8F] px-4 py-3 text-2xl font-extrabold text-[#34222E] focus:border-[#E2424A] focus:outline-none"
                                    />
                                    <div className="flex flex-wrap gap-2">
                                        {['1', '2', '3', '5', '10'].map((preset) => (
                                            <button
                                                key={preset}
                                                type="button"
                                                onClick={() => setInputPrecio(preset)}
                                                className="rounded-lg border border-[#F9BF8F] bg-[#FEE9D6]/40 px-3 py-1 text-xs font-bold text-[#34222E] hover:bg-[#F9BF8F]/40"
                                            >
                                                ${preset}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {modo === 'ambos' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="mb-1 block text-xs font-bold uppercase text-[#34222E]/70">
                                            Romana real (lb)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            autoFocus
                                            value={inputLibras}
                                            onChange={(e) => setInputLibras(e.target.value)}
                                            placeholder="1.85"
                                            className="w-full rounded-xl border-2 border-[#F9BF8F] px-3.5 py-2.5 text-xl font-extrabold text-[#34222E] focus:border-[#E2424A] focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-bold uppercase text-[#34222E]/70">
                                            Monto cobrado ($)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            value={inputPrecio}
                                            onChange={(e) => setInputPrecio(e.target.value)}
                                            placeholder="5.00"
                                            className="w-full rounded-xl border-2 border-[#F9BF8F] px-3.5 py-2.5 text-xl font-extrabold text-[#34222E] focus:border-[#E2424A] focus:outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Resumen calculado antes de agregar */}
                            <div className="flex items-center justify-between rounded-xl bg-[#FEE9D6]/70 px-4 py-3">
                                <div>
                                    <span className="block text-[11px] uppercase text-[#34222E]/60">
                                        Sale de vitrina
                                    </span>
                                    <strong className="text-base font-extrabold text-[#34222E]">
                                        {calculoModal.libras.toFixed(2)} lb
                                    </strong>
                                </div>
                                <div className="text-right">
                                    <span className="block text-[11px] uppercase text-[#34222E]/60">
                                        Subtotal corte
                                    </span>
                                    <strong className="text-xl font-black text-[#E2424A]">
                                        ${calculoModal.monto.toFixed(2)}
                                    </strong>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E2424A] py-3 text-sm font-extrabold text-white shadow transition hover:bg-[#c9353c]"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Agregar al Ticket</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
        </AppLayout>
    );
}
