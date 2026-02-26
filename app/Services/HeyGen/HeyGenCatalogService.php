<?php

namespace App\Services\HeyGen;

use Illuminate\Support\Facades\Cache;

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
        /** @var array<int, array<string, mixed>> $avatars */
        $avatars = Cache::remember('heygen:catalog:avatars', now()->addMinutes(15), function (): array {
            $response = $this->client->listAvatars();
            return $this->extractItems($response);
        });

        /** @var array<int, array<string, mixed>> $voices */
        $voices = Cache::remember('heygen:catalog:voices', now()->addMinutes(15), function (): array {
            $response = $this->client->listVoices();
            return $this->extractItems($response);
        });

        return [
            'avatars' => $avatars,
            'voices' => $voices,
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

        if (is_array($data) && isset($data['voices']) && is_array($data['voices'])) {
            return array_values(array_filter($data['voices'], 'is_array'));
        }

        return [];
    }
}
