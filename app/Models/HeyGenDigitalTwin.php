<?php

namespace App\Models;

use App\Domain\HeyGen\Enums\DigitalTwinStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HeyGenDigitalTwin extends Model
{
    use HasFactory;

    protected $table = 'heygen_digital_twins';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'provider_avatar_id',
        'provider_avatar_group_id',
        'avatar_name',
        'training_video_path',
        'consent_video_path',
        'training_video_url',
        'consent_video_url',
        'status',
        'error_code',
        'error_message',
        'provider_payload',
        'preview_image_url',
        'preview_video_url',
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
            'status' => DigitalTwinStatus::class,
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

