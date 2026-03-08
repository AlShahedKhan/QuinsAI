<?php

namespace App\Http\Resources\HeyGen;

use App\Models\HeyGenVideoAgentJob;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin HeyGenVideoAgentJob */
class VideoAgentJobResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'prompt' => $this->prompt,
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
