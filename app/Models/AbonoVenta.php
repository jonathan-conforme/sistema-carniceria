<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AbonoVenta extends Model
{
    protected $table = 'abonos_ventas';

    protected $fillable = [
        'venta_id',
        'user_id',
        'monto_abonado',
        'metodo_pago',
        'observacion',
    ];

    protected function casts(): array
    {
        return [
            'monto_abonado' => 'decimal:2',
        ];
    }

    public function venta(): BelongsTo
    {
        return $this->belongsTo(Venta::class, 'venta_id');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
