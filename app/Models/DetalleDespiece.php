<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DetalleDespiece extends Model
{
    protected $table = 'detalles_despiece';

    protected $fillable = [
        'sesion_despiece_id',
        'producto_id',
        'libras_obtenidas',
        'costo_asignado_libra',
    ];

    protected function casts(): array
    {
        return [
            'libras_obtenidas'     => 'decimal:2',
            'costo_asignado_libra' => 'decimal:4',
        ];
    }

    public function sesion_despiece(): BelongsTo
    {
        return $this->belongsTo(SesionDespiece::class, 'sesion_despiece_id');
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class, 'producto_id');
    }
}
