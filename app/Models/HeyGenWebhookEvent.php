<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HeyGenWebhookEvent extends Model
{
    use HasFactory;

    protected $table = 'heygen_webhook_events';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'provider_event_id',
        'event_type',
        'signature_valid',
        'payload',
        'received_at',
        'processed_at',
        'processing_error',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'signature_valid' => 'boolean',
            'payload' => 'array',
            'received_at' => 'datetime',
            'processed_at' => 'datetime',
        ];
    }
}
