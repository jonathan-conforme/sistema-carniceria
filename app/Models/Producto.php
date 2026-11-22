<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Producto extends Model
{
    protected $table = 'productos';

    protected $fillable = [
        'nombre',
        'precio_venta_libra',
        'costo_actual_libra',
        'stock_libras',
        'stock_minimo_libras',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'precio_venta_libra'  => 'decimal:2',
            'costo_actual_libra'  => 'decimal:4',
            'stock_libras'        => 'decimal:2',
            'stock_minimo_libras' => 'decimal:2',
            'activo'              => 'boolean',
        ];
    }

    public function scopeActivos(Builder $query): Builder
    {
        return $query->where('activo', true);
    }

    public function scopeStockBajo(Builder $query): Builder
    {
        return $query->whereColumn('stock_libras', '<=', 'stock_minimo_libras');
    }

    public function detalles_despiece(): HasMany
    {
        return $this->hasMany(DetalleDespiece::class, 'producto_id');
    }

    public function detalles_venta(): HasMany
    {
        return $this->hasMany(DetalleVenta::class, 'producto_id');
    }

    public function movimientos(): HasMany
    {
        return $this->hasMany(MovimientoInventario::class, 'producto_id');
    }
}
