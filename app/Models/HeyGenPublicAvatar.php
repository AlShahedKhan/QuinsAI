<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HeyGenPublicAvatar extends Model
{
    use HasFactory;

    protected $table = 'heygen_public_avatars';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'provider_avatar_id',
        'name',
        'preview_image_url',
        'looks_count',
        'categories',
        'search_text',
        'provider_payload',
        'is_active',
        'synced_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'categories' => 'array',
            'provider_payload' => 'array',
            'is_active' => 'boolean',
            'synced_at' => 'datetime',
        ];
    }
}
