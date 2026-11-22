<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MovimientoInventario extends Model
{
    protected $table = 'movimientos_inventario';

    protected $fillable = [
        'producto_id',
        'user_id',
        'tipo',
        'peso_libras',
        'stock_anterior_libras',
        'stock_nuevo_libras',
        'observacion',
    ];

    protected function casts(): array
    {
        return [
            'peso_libras'           => 'decimal:2',
            'stock_anterior_libras' => 'decimal:2',
            'stock_nuevo_libras'    => 'decimal:2',
        ];
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class, 'producto_id');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
