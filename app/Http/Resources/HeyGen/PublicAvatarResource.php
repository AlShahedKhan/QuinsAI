<?php

namespace App\Http\Resources\HeyGen;

use App\Models\HeyGenPublicAvatar;
use Illuminate\Support\Arr;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin HeyGenPublicAvatar */
class PublicAvatarResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'avatar_id' => $this->provider_avatar_id,
            'display_name' => $this->name,
            'name' => $this->name,
            'preview_image_url' => $this->preview_image_url,
            'preview_video_url' => Arr::get($this->provider_payload ?? [], 'preview_video_url'),
            'looks' => $this->looks_count,
            'categories' => $this->categories ?? [],
            'is_public' => true,
            'synced_at' => $this->synced_at?->toIso8601String(),
        ];
    }
}
