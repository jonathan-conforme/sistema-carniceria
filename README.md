<!-- ══════════════════ CABECERA ══════════════════ -->
<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:34222E,55:E2424A,100:F9BF8F&height=180&section=header&text=POS%20Carnicer%C3%ADa&fontColor=FEE9D6&fontSize=44&fontAlignY=36&desc=Gesti%C3%B3n%20de%20Mostrador%2C%20C%C3%A1mara%2C%20Fiados%20y%20Bot%20%C2%B7%20Laravel%2012%20%2B%20React&descSize=16&descAlignY=58&animation=fadeIn" alt="POS Carnicería — Sistema Integral de Ventas e Inventario" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Laravel-12-FF2D20?style=for-the-badge&logo=laravel&logoColor=white&labelColor=34222E" alt="Laravel 12" />
  <img src="https://img.shields.io/badge/PHP-8.2-777BB4?style=for-the-badge&logo=php&logoColor=white&labelColor=34222E" alt="PHP 8.2" />
  <img src="https://img.shields.io/badge/React-Inertia%20v2-61DAFB?style=for-the-badge&logo=react&logoColor=black&labelColor=34222E" alt="React + Inertia v2" />
  <img src="https://img.shields.io/badge/Telegram-Bot%20Sync-26A5E4?style=for-the-badge&logo=telegram&logoColor=white&labelColor=34222E" alt="Bot Telegram" />
  <img src="https://img.shields.io/badge/MySQL%20%2F%20TiDB-Cloud-4479A1?style=for-the-badge&logo=mysql&logoColor=white&labelColor=34222E" alt="MySQL / TiDB" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white&labelColor=34222E" alt="Docker" />
</p>

<p align="center">
  <a href="#-c%C3%B3mo-est%C3%A1-organizada"><img src="https://img.shields.io/badge/%F0%9F%8F%97%EF%B8%8F%20Arquitectura-E2424A?style=for-the-badge&labelColor=34222E" alt="Arquitectura" /></a>
  <a href="#-m%C3%B3dulos-del-sistema"><img src="https://img.shields.io/badge/%F0%9F%A5%A9%20M%C3%B3dulos-F9BF8F?style=for-the-badge&labelColor=34222E" alt="Módulos" /></a>
  <a href="#-calidad-y-comandos"><img src="https://img.shields.io/badge/%E2%9C%85%20Calidad%20%26%20Tests-FEE9D6?style=for-the-badge&labelColor=34222E" alt="Calidad y Tests" /></a>
</p>

---

<!-- ══════════════════ INTRO ══════════════════ -->
<h3 align="center">Sistema punto de venta, control de despiece y arqueo de caja para carnicería con operación omnicanal.</h3>

<p align="center">
  Unifica la venta en mostrador web y el registro móvil desde <b>Telegram</b> sobre un mismo núcleo transaccional,<br />
  controlando compras en canal, rendimiento de cortes, merma real y cartera de fiados.
</p>

<p align="center">
  <sub>Servicios desacoplados · Transacciones con bloqueo pesimista · Analítica Chart.js · PDF vectorial en cliente</sub>
</p>

<br />

<!-- ══════════════════ TRES CAMINOS ══════════════════ -->
<table align="center">
  <tr>
    <td align="center" width="33%">
      <img src="https://img.shields.io/badge/-Desarrollar-E2424A?style=for-the-badge&logo=laravel&logoColor=white" alt="" /><br /><br />
      <b>Con recarga en caliente</b><br />
      <code>composer install && npm install</code><br />
      <code>cp .env.example .env</code><br />
      <code>php artisan migrate --seed</code><br />
      <code>composer run dev</code><br />
      <sub>Levanta PHP, Vite y colas en <a href="http://127.0.0.1:8000">:8000</a></sub>
    </td>
    <td align="center" width="33%">
      <img src="https://img.shields.io/badge/-Contenedor-34222E?style=for-the-badge&logo=docker&logoColor=white" alt="" /><br /><br />
      <b>Listo para producción</b><br />
      <code>docker build -t pos-carniceria .</code><br />
      <code>docker run -p 8080:8080 pos-carniceria</code><br /><br />
      <sub>Imagen optimizada con PHP 8.2, assets compilados y migraciones automáticas</sub>
    </td>
    <td align="center" width="33%">
      <img src="https://img.shields.io/badge/-Operar-F9BF8F?style=for-the-badge&logo=telegram&logoColor=34222E" alt="" /><br /><br />
      <b>Web + Bot Telegram</b><br />
      <code>/dashboard</code> · <code>/pos</code> · <code>/ventas</code><br />
      <code>/inventario</code> · <code>/reportes</code><br /><br />
      <sub>Sincronización en tiempo real entre mostrador y comandos móviles</sub>
    </td>
  </tr>
</table>

<br />

---

<!-- ══════════════════ 01 ARQUITECTURA ══════════════════ -->

## <img src="https://img.shields.io/badge/-01-E2424A?style=flat-square&labelColor=34222E" alt="" />&nbsp; Cómo está organizada

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>Núcleo de servicios compartidos</h3>
      <p>Toda la lógica de negocio vive en <code>app/Services/</code> (<code>VentaService</code>, <code>InventarioService</code>, <code>ReporteService</code>). Los controladores web y el webhook de Telegram delegan en los mismos servicios bajo <code>DB::transaction()</code> y <code>lockForUpdate()</code> para evitar descuadres de stock o saldos.</p>
      <p>
        <img src="https://img.shields.io/badge/Controller-HTTP%20%E2%86%94%20Inertia-34222E?style=flat-square" alt="" />
        <img src="https://img.shields.io/badge/FormRequest-Validaci%C3%B3n-34222E?style=flat-square" alt="" />
        <img src="https://img.shields.io/badge/Service-Transacciones-34222E?style=flat-square" alt="" />
      </p>
    </td>
    <td width="50%" valign="top">
      <h3>SPA React + Inertia v2 sin fricción</h3>
      <p>Las vistas viven en <code>resources/js/pages/</code> con tipado en TypeScript. Las gráficas de tendencias usan <code>Chart.js</code> y la generación de reportes A4 se ejecuta en el navegador mediante <code>jsPDF</code> + <code>jspdf-autotable</code>, dejando al servidor libre de carga pesada.</p>
      <p>
        <img src="https://img.shields.io/badge/Inertia%20v2-SPA%20Monolito-34222E?style=flat-square" alt="" />
        <img src="https://img.shields.io/badge/Chart.js-Anal%C3%ADtica-34222E?style=flat-square" alt="" />
        <img src="https://img.shields.io/badge/jsPDF-Reportes%20Client--Side-34222E?style=flat-square" alt="" />
      </p>
    </td>
  </tr>
</table>

```
app/
  Http/
    Controllers/       Dashboard, POS, Ventas/Fiados, Inventario, Reportes y Telegram
    Requests/          Validación estricta por acción (GuardarVenta, GuardarAbono, etc.)
  Models/              Producto, Compra, Despiece, Venta, VentaDetalle, AbonoVenta
  Services/            Lógica transaccional compartida (Web + Bot Telegram)
bootstrap/             Configuración streamlined Laravel 12 (app.php, providers.php)
database/
  migrations/          Esquema de inventario, ventas, abonos y despieces
  seeders/             Catálogo inicial de cortes y usuario administrador
resources/js/
  components/          Sidebar, tarjetas KPI y componentes reutilizables
  pages/               Dashboard, POS, Fiados/Ventas, Inventario y Reportes
  utils/               Generador vectorial de reportes PDF (jsPDF)
tests/                 Suite automatizada con Pest
```

<br />

---

<!-- ══════════════════ 02 MÓDULOS ══════════════════ -->

## <img src="https://img.shields.io/badge/-02-F9BF8F?style=flat-square&labelColor=34222E" alt="" />&nbsp; Módulos del sistema

| Módulo | Ruta | Capacidades principales |
| :--- | :--- | :--- |
| **Dashboard Ejecutivo** | `/dashboard` | KPIs del día, comparativa de ventas de los últimos 7/30 días, distribución por método de pago y top de cortes más vendidos con `Chart.js`. |
| **POS Mostrador** | `/pos` | Cobro ágil por peso en libras, cálculo automático de ganancia neta por ticket y registro en efectivo, transferencia o fiado. |
| **Cámara y Despiece** | `/inventario` | Registro de compras de canal, sesiones de despiece con cálculo de libras útiles vs. merma (`%`), ajustes y stock en vitrina en tiempo real. |
| **Fiados y Abonos** | `/ventas` | Cartera agrupada por cliente deudor, desglose de tickets pendientes, registro de abonos parciales/totales e impacto inmediato en el arqueo diario. |
| **Reportes y Arqueo** | `/reportes` | Filtros por rango de fechas, canal (`Web` / `Telegram`) y método de pago; arqueo real de cajón (ventas + abonos), descarga en **Excel (CSV)** y **PDF A4**. |

<br />

---

<!-- ══════════════════ 03 CALIDAD ══════════════════ -->

## <img src="https://img.shields.io/badge/-03-FEE9D6?style=flat-square&labelColor=34222E" alt="" />&nbsp; Calidad y comandos

<table align="center">
  <tr>
    <td align="center" width="25%">
      <b>Laravel Pint</b><br /><sub>Formato PSR-12 / Laravel<br />en todo el backend PHP</sub>
    </td>
    <td align="center" width="25%">
      <b>Pest PHP</b><br /><sub>Tests funcionales y unitarios<br />con base aislada</sub>
    </td>
    <td align="center" width="25%">
      <b>TypeScript + Vite</b><br /><sub>Compilación estricta<br />y bundle optimizado</sub>
    </td>
    <td align="center" width="25%">
      <b>Transacciones SQL</b><br /><sub>Atomicidad en ventas,<br />abonos y despieces</sub>
    </td>
  </tr>
</table>

| Quiero… | Comando |
| :--- | :--- |
| Levantar entorno completo (PHP + Vite + Queue) | `composer run dev` |
| Ejecutar la suite de pruebas con Pest | `php artisan test --compact` |
| Formatear código PHP con Laravel Pint | `vendor/bin/pint --format agent` |
| Compilar assets de producción | `npm run build` |
| Inspeccionar rutas registradas | `php artisan route:list` |
| Reiniciar base de datos con datos iniciales | `php artisan migrate:fresh --seed` |

<br />

---

<!-- ══════════════════ 04 DECISIONES ══════════════════ -->

## <img src="https://img.shields.io/badge/-04-E2424A?style=flat-square&labelColor=34222E" alt="" />&nbsp; Decisiones de arquitectura

| # | Decisión | Justificación |
| :--- | :--- | :--- |
| **01** | **Service Layer único (Web + Bot)** | Evita duplicar reglas de stock, costos promedio y saldos entre Inertia y el webhook de Telegram. |
| **02** | **Bloqueo pesimista (`lockForUpdate`)** | Garantiza integridad cuando el mostrador y el bot de Telegram registran ventas o abonos simultáneamente. |
| **03** | **PDF vectorial en cliente (`jsPDF`)** | Genera reportes A4 listos para imprimir o compartir sin consumir RAM ni CPU en contenedores gratuitos. |
| **04** | **Compatibilidad multi-motor SQL** | Consultas compatibles tanto con SQLite en desarrollo local como con MySQL / TiDB Serverless en producción. |

<br />

---

<!-- ══════════════════ DESPLIEGUE ══════════════════ -->
<p align="center">
  <img src="https://img.shields.io/badge/Hosting-Render-46E3B7?style=for-the-badge&logo=render&logoColor=black&labelColor=34222E" alt="Render" />
  <img src="https://img.shields.io/badge/Base%20de%20Datos-TiDB%20%2F%20MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white&labelColor=34222E" alt="TiDB / MySQL" />
  <img src="https://img.shields.io/badge/Webhook-Telegram%20Bot%20API-26A5E4?style=for-the-badge&logo=telegram&logoColor=white&labelColor=34222E" alt="Telegram Bot API" />
</p>

<p align="center"><sub>Listo para despliegue continuo con Docker: ejecuta <code>php artisan migrate --force</code>, cachea configuración/rutas y expone la aplicación web + webhook.</sub></p>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:34222E,55:E2424A,100:F9BF8F&height=90&section=footer" alt="" />
</p>