<?php

namespace App\Models;

use App\Domain\HeyGen\Enums\LiveSessionStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HeyGenLiveSession extends Model
{
    use HasFactory;

    protected $table = 'heygen_live_sessions';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'provider_session_id',
        'status',
        'token_expires_at',
        'started_at',
        'ended_at',
        'metadata',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => LiveSessionStatus::class,
            'token_expires_at' => 'datetime',
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
