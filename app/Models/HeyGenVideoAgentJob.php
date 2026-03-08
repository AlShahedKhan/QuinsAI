<?php

namespace App\Models;

use App\Domain\HeyGen\Enums\VideoJobStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HeyGenVideoAgentJob extends Model
{
    use HasFactory;

    protected $table = 'heygen_video_agent_jobs';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'provider_video_id',
        'prompt',
        'status',
        'error_code',
        'error_message',
        'provider_payload',
        'output_provider_url',
        'output_storage_url',
        'submitted_at',
        'completed_at',
        'failed_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => VideoJobStatus::class,
            'provider_payload' => 'array',
            'submitted_at' => 'datetime',
            'completed_at' => 'datetime',
            'failed_at' => 'datetime',
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
