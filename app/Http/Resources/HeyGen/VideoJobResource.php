<?php

namespace App\Http\Resources\HeyGen;

use App\Models\HeyGenVideoJob;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin HeyGenVideoJob */
class VideoJobResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'avatar_id' => $this->avatar_id,
            'voice_id' => $this->voice_id,
            'script' => $this->script,
            'status' => $this->status->value,
            'provider_video_id' => $this->provider_video_id,
            'error_code' => $this->error_code,
            'error_message' => $this->error_message,
            'output_provider_url' => $this->output_provider_url,
            'output_storage_url' => $this->output_storage_url,
            'submitted_at' => $this->submitted_at?->toIso8601String(),
            'completed_at' => $this->completed_at?->toIso8601String(),
            'failed_at' => $this->failed_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
