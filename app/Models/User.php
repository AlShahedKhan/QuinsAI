<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, HasRoles;

    protected string $guard_name = 'sanctum';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    // 
    protected $fillable = [
        'name',
        'email',
        'password',
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
            'is_admin' => 'boolean',
            'password' => 'hashed',
        ];
    }

    /**
     * @return HasMany<HeyGenVideoJob, $this>
     */
    public function heygenVideoJobs(): HasMany
    {
        return $this->hasMany(HeyGenVideoJob::class);
    }

    /**
     * @return HasMany<HeyGenLiveSession, $this>
     */
    public function heygenLiveSessions(): HasMany
    {
        return $this->hasMany(HeyGenLiveSession::class);
    }

    /**
     * @return HasMany<AuthRefreshToken, $this>
     */
    public function refreshTokens(): HasMany
    {
        return $this->hasMany(AuthRefreshToken::class);
    }

    public function isAdmin(): bool
    {
        return $this->hasRole('super-admin');
    }
}
