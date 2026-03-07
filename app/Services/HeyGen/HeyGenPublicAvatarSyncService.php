<?php

namespace App\Services\HeyGen;

use App\Models\HeyGenPublicAvatar;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

class HeyGenPublicAvatarSyncService
{
    public function __construct(
        private readonly HeyGenClient $client,
    ) {
    }

    /**
     * @return array{synced:int, activated:int, deactivated:int}
     */
    public function sync(): array
    {
        $syncTime = now();
        $items = $this->extractItems($this->client->listAvatars(
            max(5, (int) config('services.heygen.public_avatar_sync_timeout', 180)),
            max(0, (int) config('services.heygen.public_avatar_sync_retry_times', 0)),
        ));

        $records = [];
        $providerAvatarIds = [];

        foreach ($items as $item) {
            $record = $this->normalizeAvatar($item, $syncTime);

            if ($record === null) {
                continue;
            }

            $records[] = $record;
            $providerAvatarIds[] = $record['provider_avatar_id'];
        }

        $providerAvatarIds = array_values(array_unique($providerAvatarIds));

        if ($records !== []) {
            HeyGenPublicAvatar::query()->upsert(
                $records,
                ['provider_avatar_id'],
                ['name', 'preview_image_url', 'looks_count', 'categories', 'search_text', 'provider_payload', 'is_active', 'synced_at', 'updated_at'],
            );
        }

        $deactivated = HeyGenPublicAvatar::query()
            ->when($providerAvatarIds !== [], fn ($query) => $query->whereNotIn('provider_avatar_id', $providerAvatarIds))
            ->where('is_active', true)
            ->update([
                'is_active' => false,
                'updated_at' => $syncTime,
            ]);

        Cache::forget('heygen:public-avatars:categories');

        return [
            'synced' => count($records),
            'activated' => count($records),
            'deactivated' => $deactivated,
        ];
    }

    /**
     * @param  array<string, mixed>  $response
     * @return array<int, array<string, mixed>>
     */
    private function extractItems(array $response): array
    {
        $data = $response['data'] ?? $response;

        if (is_array($data) && isset($data['items']) && is_array($data['items'])) {
            return array_values(array_filter($data['items'], 'is_array'));
        }

        if (is_array($data) && array_is_list($data)) {
            return array_values(array_filter($data, 'is_array'));
        }

        if (is_array($data) && isset($data['avatars']) && is_array($data['avatars'])) {
            return array_values(array_filter($data['avatars'], 'is_array'));
        }

        return [];
    }

    /**
     * @param  array<string, mixed>  $item
     * @return array<string, mixed>|null
     */
    private function normalizeAvatar(array $item, Carbon $syncTime): ?array
    {
        $avatarId = $this->readFirstString($item, ['avatar_id', 'id', 'name']);
        if ($avatarId === null) {
            return null;
        }

        $name = $this->readFirstString($item, ['display_name', 'name', 'avatar_name', 'avatar_id', 'id']) ?? $avatarId;
        $categories = $this->collectCategoryValues($item, ['category', 'categories', 'avatar_type', 'type', 'style', 'tags', 'gender']);

        return [
            'provider_avatar_id' => $avatarId,
            'name' => $name,
            'preview_image_url' => $this->readFirstString($item, [
                'preview_image_url',
                'preview_url',
                'thumbnail_url',
                'avatar_image_url',
                'image_url',
                'photo_url',
                'cover_url',
            ]),
            'looks_count' => $this->readFirstNumber($item, ['looks', 'looks_count', 'look_count']),
            'categories' => json_encode($categories) ?: '[]',
            'search_text' => mb_strtolower(trim(implode(' ', array_filter([
                $name,
                $avatarId,
                implode(' ', $categories),
            ])))),
            'provider_payload' => json_encode($item) ?: '{}',
            'is_active' => true,
            'synced_at' => $syncTime,
            'created_at' => $syncTime,
            'updated_at' => $syncTime,
        ];
    }

    /**
     * @param  array<string, mixed>  $item
     */
    private function readFirstString(array $item, array $keys): ?string
    {
        foreach ($keys as $key) {
            $value = $item[$key] ?? null;
            if (is_string($value) && trim($value) !== '') {
                return trim($value);
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $item
     */
    private function readFirstNumber(array $item, array $keys): ?int
    {
        foreach ($keys as $key) {
            $value = $item[$key] ?? null;

            if (is_int($value)) {
                return $value;
            }

            if (is_float($value) && is_finite($value)) {
                return (int) round($value);
            }

            if (is_string($value) && is_numeric($value)) {
                return (int) $value;
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $item
     * @return array<int, string>
     */
    private function collectCategoryValues(array $item, array $keys): array
    {
        $values = [];

        foreach ($keys as $key) {
            $rawValue = $item[$key] ?? null;

            if (is_string($rawValue) && trim($rawValue) !== '') {
                $values[] = trim($rawValue);
                continue;
            }

            if (! is_array($rawValue)) {
                continue;
            }

            foreach ($rawValue as $entry) {
                if (is_string($entry) && trim($entry) !== '') {
                    $values[] = trim($entry);
                }
            }
        }

        return array_values(array_unique($values));
    }
}
