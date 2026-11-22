<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DetalleVenta extends Model
{
    protected $table = 'detalles_venta';

    protected $fillable = [
        'venta_id',
        'producto_id',
        'peso_libras',
        'precio_unitario_libra',
        'costo_unitario_libra',
        'subtotal',
        'ganancia',
    ];

    protected function casts(): array
    {
        return [
            'peso_libras'           => 'decimal:2',
            'precio_unitario_libra' => 'decimal:2',
            'costo_unitario_libra'  => 'decimal:4',
            'subtotal'              => 'decimal:2',
            'ganancia'              => 'decimal:2',
        ];
    }

    public function venta(): BelongsTo
    {
        return $this->belongsTo(Venta::class, 'venta_id');
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class, 'producto_id');
    }
}
