<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HeyGenUsageDaily extends Model
{
    use HasFactory;

    protected $table = 'heygen_usage_daily';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'usage_date',
        'video_requests',
        'live_session_minutes',
        'cost_units',
        'daily_request_limit',
        'daily_minute_limit',
        'blocked_until',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'blocked_until' => 'datetime',
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
