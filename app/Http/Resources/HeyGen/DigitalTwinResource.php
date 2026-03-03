<?php

namespace App\Http\Resources\HeyGen;

use App\Models\HeyGenDigitalTwin;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin HeyGenDigitalTwin */
class DigitalTwinResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'avatar_name' => $this->avatar_name,
            'status' => $this->status->value,
            'provider_avatar_id' => $this->provider_avatar_id,
            'provider_avatar_group_id' => $this->provider_avatar_group_id,
            'error_code' => $this->error_code,
            'error_message' => $this->error_message,
            'preview_image_url' => $this->preview_image_url,
            'preview_video_url' => $this->preview_video_url,
            'submitted_at' => $this->submitted_at?->toIso8601String(),
            'completed_at' => $this->completed_at?->toIso8601String(),
            'failed_at' => $this->failed_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

