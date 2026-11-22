<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SesionDespiece extends Model
{
    protected $table = 'sesiones_despiece';

    protected $fillable = [
        'compra_id',
        'user_id',
        'pieza_origen',
        'observacion',
        'peso_bruto_usado_libras',
        'peso_util_obtenido_libras',
        'merma_libras',
        'costo_real_libra_sesion',
    ];

    protected function casts(): array
    {
        return [
            'peso_bruto_usado_libras'   => 'decimal:2',
            'peso_util_obtenido_libras' => 'decimal:2',
            'merma_libras'              => 'decimal:2',
            'costo_real_libra_sesion'   => 'decimal:4',
        ];
    }

    public function compra(): BelongsTo
    {
        return $this->belongsTo(Compra::class, 'compra_id');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(DetalleDespiece::class, 'sesion_despiece_id');
    }
}
