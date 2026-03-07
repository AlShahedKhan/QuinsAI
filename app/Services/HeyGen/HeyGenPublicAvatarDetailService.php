<?php

namespace App\Services\HeyGen;

use App\Models\HeyGenPublicAvatar;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

class HeyGenPublicAvatarDetailService
{
    public function __construct(
        private readonly HeyGenClient $client,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function getDetails(HeyGenPublicAvatar $avatar): array
    {
        $cacheKey = 'heygen:public-avatar:details:'.$avatar->provider_avatar_id;

        try {
            /** @var array<string, mixed> $details */
            $details = Cache::remember($cacheKey, now()->addHours(12), function () use ($avatar): array {
                $response = $this->client->getAvatarDetails(
                    $avatar->provider_avatar_id,
                    max(5, (int) config('services.heygen.public_avatar_details_timeout', 25)),
                    max(0, (int) config('services.heygen.public_avatar_details_retry_times', 0)),
                );

                return $this->normalizeProviderDetails($avatar, $response);
            });

            return $details;
        } catch (Throwable $throwable) {
            Log::warning('HeyGen public avatar details fetch failed, returning local fallback.', [
                'avatar_id' => $avatar->provider_avatar_id,
                'error' => $throwable->getMessage(),
            ]);

            /** @var mixed $cached */
            $cached = Cache::get($cacheKey);
            if (is_array($cached)) {
                $cached['details_source'] = 'cache';
                $cached['details_notice'] = 'Showing cached avatar details.';

                return $cached;
            }

            return $this->fallbackDetails($avatar, 'local');
        }
    }

    /**
     * @param  array<string, mixed>  $response
     * @return array<string, mixed>
     */
    private function normalizeProviderDetails(HeyGenPublicAvatar $avatar, array $response): array
    {
        $data = $response['data'] ?? $response;
        $base = $this->fallbackDetails($avatar, 'provider');

        if (! is_array($data)) {
            return $base;
        }

        $looks = $this->extractLooks($data);

        return [
            'avatar_id' => (string) ($data['id'] ?? $avatar->provider_avatar_id),
            'display_name' => (string) ($data['name'] ?? $avatar->name),
            'name' => (string) ($data['name'] ?? $avatar->name),
            'preview_image_url' => $data['preview_image_url'] ?? $avatar->preview_image_url,
            'preview_video_url' => $data['preview_video_url'] ?? Arr::get($avatar->provider_payload ?? [], 'preview_video_url'),
            'gender' => $data['gender'] ?? Arr::get($avatar->provider_payload ?? [], 'gender'),
            'default_voice_id' => $data['default_voice_id'] ?? Arr::get($avatar->provider_payload ?? [], 'default_voice_id'),
            'premium' => (bool) ($data['premium'] ?? Arr::get($avatar->provider_payload ?? [], 'premium', false)),
            'is_public' => (bool) ($data['is_public'] ?? true),
            'tags' => $this->normalizeStrings($data['tags'] ?? Arr::get($avatar->provider_payload ?? [], 'tags', [])),
            'looks' => $looks,
            'looks_available' => $looks !== [],
            'looks_note' => $looks !== []
                ? null
                : 'Public avatar details do not expose separate look variants in the current API. Multi-look workflows are available for photo avatar groups.',
            'details_source' => 'provider',
            'details_notice' => null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function fallbackDetails(HeyGenPublicAvatar $avatar, string $source): array
    {
        return [
            'avatar_id' => $avatar->provider_avatar_id,
            'display_name' => $avatar->name,
            'name' => $avatar->name,
            'preview_image_url' => $avatar->preview_image_url,
            'preview_video_url' => Arr::get($avatar->provider_payload ?? [], 'preview_video_url'),
            'gender' => Arr::get($avatar->provider_payload ?? [], 'gender'),
            'default_voice_id' => Arr::get($avatar->provider_payload ?? [], 'default_voice_id'),
            'premium' => (bool) Arr::get($avatar->provider_payload ?? [], 'premium', false),
            'is_public' => true,
            'tags' => $this->normalizeStrings(Arr::get($avatar->provider_payload ?? [], 'tags', [])),
            'looks' => [],
            'looks_available' => false,
            'looks_note' => 'Public avatar details do not expose separate look variants in the current API. Multi-look workflows are available for photo avatar groups.',
            'details_source' => $source,
            'details_notice' => $source === 'local' ? 'Showing locally cached catalog data only.' : null,
        ];
    }

    /**
     * @param  mixed  $value
     * @return array<int, string>
     */
    private function normalizeStrings(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        return array_values(array_filter(array_map(static function (mixed $item): ?string {
            return is_string($item) && trim($item) !== '' ? trim($item) : null;
        }, $value)));
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<int, array<string, mixed>>
     */
    private function extractLooks(array $data): array
    {
        $candidateLooks = $data['looks'] ?? Arr::get($data, 'avatar_group.looks', []);
        if (! is_array($candidateLooks)) {
            return [];
        }

        $looks = [];

        foreach ($candidateLooks as $look) {
            if (! is_array($look)) {
                continue;
            }

            $lookId = Arr::get($look, 'id') ?? Arr::get($look, 'look_id') ?? Arr::get($look, 'avatar_id');
            if (! is_string($lookId) || trim($lookId) === '') {
                continue;
            }

            $looks[] = [
                'id' => trim($lookId),
                'name' => (string) (Arr::get($look, 'name') ?? Arr::get($look, 'display_name') ?? $lookId),
                'preview_image_url' => Arr::get($look, 'preview_image_url'),
                'preview_video_url' => Arr::get($look, 'preview_video_url'),
            ];
        }

        return $looks;
    }
}
