<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Venta extends Model
{
    protected $table = 'ventas';

    protected $fillable = [
        'user_id',
        'cliente',
        'telefono_cliente',
        'monto_total',
        'costo_total',
        'ganancia_total',
        'saldo_pendiente',
        'metodo_pago',
        'estado_pago',
        'origen',
    ];

    protected function casts(): array
    {
        return [
            'monto_total'     => 'decimal:2',
            'costo_total'     => 'decimal:2',
            'ganancia_total'  => 'decimal:2',
            'saldo_pendiente' => 'decimal:2',
        ];
    }

    public function scopePendientesCobro(Builder $query): Builder
    {
        return $query->whereIn('estado_pago', ['pendiente', 'parcial']);
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(DetalleVenta::class, 'venta_id');
    }

    public function abonos(): HasMany
    {
        return $this->hasMany(AbonoVenta::class, 'venta_id');
    }
}
