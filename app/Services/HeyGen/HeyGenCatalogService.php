<?php

namespace App\Services\HeyGen;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

class HeyGenCatalogService
{
    public function __construct(
        private readonly HeyGenClient $client,
    ) {
    }

    /**
     * @return array{avatars: array<int, array<string, mixed>>, voices: array<int, array<string, mixed>>}
     */
    public function getCatalog(): array
    {
        return [
            'avatars' => $this->getAvatars(),
            'voices' => $this->getVoices(),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getAvatars(): array
    {
        $catalogTimeout = max(2, (int) config('services.heygen.catalog_timeout', 45));
        $catalogRetryTimes = max(0, (int) config('services.heygen.catalog_retry_times', 0));

        /** @var array<int, array<string, mixed>> $avatars */
        $avatars = $this->rememberWithFallback('heygen:catalog:avatars', function () use ($catalogTimeout, $catalogRetryTimes): array {
            $response = $this->client->listAvatars($catalogTimeout, $catalogRetryTimes);
            return $this->extractItems($response);
        });

        return $avatars;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getVoices(): array
    {
        $catalogTimeout = max(2, (int) config('services.heygen.catalog_timeout', 45));
        $catalogRetryTimes = max(0, (int) config('services.heygen.catalog_retry_times', 0));

        /** @var array<int, array<string, mixed>> $voices */
        $voices = $this->rememberWithFallback('heygen:catalog:voices', function () use ($catalogTimeout, $catalogRetryTimes): array {
            $response = $this->client->listVoices($catalogTimeout, $catalogRetryTimes);
            return $this->extractItems($response);
        });

        return $voices;
    }

    /**
     * @param  callable(): array<int, array<string, mixed>>  $resolver
     * @return array<int, array<string, mixed>>
     */
    private function rememberWithFallback(string $key, callable $resolver): array
    {
        if (Cache::has($key)) {
            return $this->readCacheItems($key);
        }

        $freshTtlMinutes = max(1, (int) config('services.heygen.catalog_ttl_minutes', 360));
        $staleTtlMinutes = max($freshTtlMinutes, (int) config('services.heygen.catalog_stale_ttl_minutes', 10080));
        $staleKey = "{$key}:stale";

        try {
            /** @var array<int, array<string, mixed>> $resolved */
            $resolved = $resolver();
            $items = array_values(array_filter($resolved, 'is_array'));

            if ($items !== []) {
                Cache::put($key, $items, now()->addMinutes($freshTtlMinutes));
                Cache::put($staleKey, $items, now()->addMinutes($staleTtlMinutes));
                return $items;
            }

            $staleItems = $this->readCacheItems($staleKey);
            if ($staleItems !== []) {
                return $staleItems;
            }

            Cache::put($key, [], now()->addMinutes(1));

            return [];
        } catch (Throwable $throwable) {
            Log::warning('HeyGen catalog fetch failed, falling back to cached value.', [
                'cache_key' => $key,
                'error' => $throwable->getMessage(),
            ]);

            $freshItems = $this->readCacheItems($key);
            if ($freshItems !== []) {
                return $freshItems;
            }

            $staleItems = $this->readCacheItems($staleKey);
            if ($staleItems !== []) {
                return $staleItems;
            }

            throw new HeyGenException('Unable to load HeyGen avatar catalog right now. Please retry.', 503);
        }
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function readCacheItems(string $key): array
    {
        /** @var mixed $cached */
        $cached = Cache::get($key, []);
        if (! is_array($cached)) {
            return [];
        }

        return array_values(array_filter($cached, 'is_array'));
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

        if (is_array($data) && isset($data['voices']) && is_array($data['voices'])) {
            return array_values(array_filter($data['voices'], 'is_array'));
        }

        return [];
    }
}
