<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'telegram_chat_id',
        'rol',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
    public function tieneRol(string|array $roles): bool
    {
        return in_array($this->rol, (array) $roles, true);
    }

    public function compras(): HasMany
    {
        return $this->hasMany(Compra::class, 'user_id');
    }

    public function sesiones_despiece(): HasMany
    {
        return $this->hasMany(SesionDespiece::class, 'user_id');
    }

    public function ventas(): HasMany
    {
        return $this->hasMany(Venta::class, 'user_id');
    }

    public function abonos(): HasMany
    {
        return $this->hasMany(AbonoVenta::class, 'user_id');
    }

    public function movimientos_inventario(): HasMany
    {
        return $this->hasMany(MovimientoInventario::class, 'user_id');
    }
}
