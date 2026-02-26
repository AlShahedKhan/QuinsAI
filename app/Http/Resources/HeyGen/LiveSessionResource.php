<?php

namespace App\Http\Resources\HeyGen;

use App\Models\HeyGenLiveSession;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin HeyGenLiveSession */
class LiveSessionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $metadata = is_array($this->metadata) ? $this->metadata : [];

        return [
            'id' => $this->id,
            'provider_session_id' => $this->provider_session_id,
            'status' => $this->status->value,
            'token' => $metadata['token'] ?? null,
            'metadata' => [
                'ice_servers' => $metadata['ice_servers'] ?? [],
                'session_response' => $metadata['session_response'] ?? [],
            ],
            'token_expires_at' => $this->token_expires_at?->toIso8601String(),
            'started_at' => $this->started_at?->toIso8601String(),
            'ended_at' => $this->ended_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
