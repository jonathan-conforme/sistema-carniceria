import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    fiado_pendiente: number;
    ganancia_neta: number;
    margen_porcentaje: number;
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

const money = (n: number) =>
    `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function descargarReportePdf(
    filtros: Filtros,
    resumen: Resumen,
    ventasPorCorte: VentaCorte[],
    mermaPeriodo: MermaPeriodo,
    tickets: Ticket[],
) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Encabezado con paleta de marca (#34222E)
    doc.setFillColor(52, 34, 46);
    doc.rect(0, 0, 210, 28, 'F');

    doc.setTextColor(254, 233, 214); // #FEE9D6
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE DE ARQUEO, VENTAS Y MERMA', 14, 13);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(249, 191, 143); // #F9BF8F
    doc.text(
        `Período: ${filtros.fecha_inicio} al ${filtros.fecha_fin}   |   Canal: ${filtros.origen.toUpperCase()}   |   Método: ${filtros.metodo_pago.toUpperCase()}`,
        14,
        21,
    );

    // 1. Resumen de Caja y KPIs
    doc.setTextColor(52, 34, 46);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Resumen Ejecutivo y Arqueo de Caja', 14, 37);

    autoTable(doc, {
        startY: 40,
        theme: 'grid',
        headStyles: { fillColor: [52, 34, 46], textColor: [254, 233, 214], fontSize: 8.5 },
        bodyStyles: { fontSize: 8.5, textColor: [40, 40, 40] },
        head: [['Concepto', 'Valor', 'Detalle / Desglose', 'Valor']],
        body: [
            ['Ingreso Real en Caja', money(resumen.ingreso_real_caja), 'Efectivo Total (Ventas + Abonos)', money(resumen.efectivo_total)],
            ['Total Facturado', money(resumen.total_facturado), 'Transferencia Total (Ventas + Abonos)', money(resumen.transferencia_total)],
            ['Ganancia Neta', `${money(resumen.ganancia_neta)} (${resumen.margen_porcentaje}%)`, 'Fiado Pendiente del Período', money(resumen.fiado_pendiente)],
            ['Tickets Emitidos', String(resumen.cantidad_tickets), 'Merma en Cámara', `${mermaPeriodo.merma_total} lb (${mermaPeriodo.porcentaje_merma}%)`],
        ],
    });

    // 2. Rendimiento por Corte
    const yCortes = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Rendimiento por Corte', 14, yCortes);

    autoTable(doc, {
        startY: yCortes + 3,
        theme: 'striped',
        headStyles: { fillColor: [226, 66, 74], textColor: [255, 255, 255], fontSize: 8.5 }, // #E2424A
        bodyStyles: { fontSize: 8.5 },
        columnStyles: {
            1: { halign: 'right' },
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right' },
        },
        head: [['Corte', 'Libras', 'Total Vendido', 'Ganancia', 'Participación']],
        body:
            ventasPorCorte.length > 0
                ? ventasPorCorte.map((c) => [
                      c.nombre,
                      `${c.libras.toFixed(2)} lb`,
                      money(c.total),
                      money(c.ganancia),
                      `${c.participacion}%`,
                  ])
                : [['Sin ventas de cortes en este período', '', '', '', '']],
    });

    // 3. Detalle de Tickets
    const yTickets = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`3. Detalle de Tickets (${tickets.length})`, 14, yTickets);

    autoTable(doc, {
        startY: yTickets + 3,
        theme: 'striped',
        headStyles: { fillColor: [52, 34, 46], textColor: [254, 233, 214], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
            5: { halign: 'right' },
            6: { halign: 'right' },
            7: { halign: 'right' },
        },
        head: [['#', 'Fecha', 'Cliente', 'Canal', 'Método', 'Total', 'Saldo', 'Ganancia']],
        body:
            tickets.length > 0
                ? tickets.map((t) => [
                      `#${t.id}`,
                      t.fecha,
                      t.cliente,
                      t.origen.toUpperCase(),
                      t.metodo_pago.toUpperCase(),
                      money(t.monto_total),
                      t.saldo_pendiente > 0 ? money(t.saldo_pendiente) : '-',
                      money(t.ganancia_total),
                  ])
                : [['-', 'Sin tickets registrados', '', '', '', '', '', '']],
    });

    doc.save(`reporte_carniceria_${filtros.fecha_inicio}_a_${filtros.fecha_fin}.pdf`);
}