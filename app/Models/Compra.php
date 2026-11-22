<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Compra extends Model
{
    protected $table = 'compras';

    protected $fillable = [
        'user_id',
        'proveedor',
        'descripcion',
        'peso_inicial_libras',
        'peso_disponible_bruto_libras',
        'costo_total',
        'costo_base_libra',
        'merma_acumulada_libras',
        'estado',
        'fecha_compra',
    ];

    protected function casts(): array
    {
        return [
            'peso_inicial_libras'          => 'decimal:2',
            'peso_disponible_bruto_libras' => 'decimal:2',
            'costo_total'                  => 'decimal:2',
            'costo_base_libra'             => 'decimal:4',
            'merma_acumulada_libras'     => 'decimal:2',
            'fecha_compra'                 => 'date',
        ];
    }

    public function scopeConSaldoBruto(Builder $query): Builder
    {
        return $query->where('estado', 'con_saldo_bruto');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function sesiones_despiece(): HasMany
    {
        return $this->hasMany(SesionDespiece::class, 'compra_id');
    }
}
