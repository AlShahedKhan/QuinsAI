<?php

namespace App\Services\HeyGen;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

class HeyGenClient
{
    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function generateVideo(array $payload): array
    {
        return $this->request('post', '/v2/video/generate', $payload);
    }

    /**
     * @return array<string, mixed>
     */
    public function getVideoStatus(string $providerVideoId): array
    {
        return $this->request('get', '/v1/video_status.get', ['video_id' => $providerVideoId]);
    }

    /**
     * @return array<string, mixed>
     */
    public function listAvatars(?int $timeoutSeconds = null, ?int $retryTimes = null): array
    {
        return $this->request(
            method: 'get',
            uri: '/v2/avatars',
            timeoutSeconds: $timeoutSeconds,
            retryTimes: $retryTimes,
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function listVoices(?int $timeoutSeconds = null, ?int $retryTimes = null): array
    {
        return $this->request(
            method: 'get',
            uri: '/v2/voices',
            timeoutSeconds: $timeoutSeconds,
            retryTimes: $retryTimes,
        );
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function createDigitalTwin(array $payload): array
    {
        return $this->request('post', '/v2/video_avatar', $payload);
    }

    /**
     * @return array<string, mixed>
     */
    public function getDigitalTwinStatus(string $providerAvatarId): array
    {
        return $this->request('get', '/v2/video_avatar/'.rawurlencode($providerAvatarId));
    }

    /**
     * @return array<string, mixed>
     */
    public function deleteDigitalTwin(string $providerAvatarId): array
    {
        return $this->request('delete', '/v2/video_avatar/'.rawurlencode($providerAvatarId));
    }

    /**
     * @return array<string, mixed>
     */
    public function createStreamingToken(string $userIdentifier): array
    {
        return $this->request('post', '/v1/streaming.create_token', [
            'user_id' => $userIdentifier,
        ]);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function createLiveSession(array $payload): array
    {
        return $this->request('post', '/v1/streaming.new', $payload);
    }

    /**
     * @return array<string, mixed>
     */
    public function endLiveSession(string $providerSessionId): array
    {
        return $this->request('post', '/v1/streaming.stop', [
            'session_id' => $providerSessionId,
        ]);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function request(
        string $method,
        string $uri,
        array $payload = [],
        ?int $timeoutSeconds = null,
        ?int $retryTimes = null,
    ): array
    {
        $apiKey = (string) config('services.heygen.api_key');

        if ($apiKey === '') {
            throw new HeyGenException('HeyGen API key is not configured.', 500);
        }

        $request = $this->baseRequest(
            apiKey: $apiKey,
            timeoutSeconds: $timeoutSeconds,
            retryTimes: $retryTimes,
        );

        $response = match (strtolower($method)) {
            'get' => $request->get($uri, $payload),
            'post' => $request->post($uri, $payload),
            'delete' => $request->delete($uri, $payload),
            default => throw new HeyGenException("Unsupported HeyGen method [$method].", 500),
        };

        $json = $response->json();

        if (! $response->successful()) {
            throw new HeyGenException(
                message: (string) ($json['message'] ?? 'HeyGen request failed.'),
                statusCode: $response->status(),
                context: is_array($json) ? $json : null,
            );
        }

        if (! is_array($json)) {
            throw new HeyGenException('HeyGen returned a non-JSON response.', 502);
        }

        if (($json['code'] ?? null) !== null && (int) $json['code'] !== 100) {
            throw new HeyGenException(
                message: (string) ($json['message'] ?? 'HeyGen business error.'),
                statusCode: 422,
                context: $json,
            );
        }

        return $json;
    }

    private function baseRequest(string $apiKey, ?int $timeoutSeconds = null, ?int $retryTimes = null): PendingRequest
    {
        $timeout = max(1, $timeoutSeconds ?? (int) config('services.heygen.timeout', 20));
        $retries = max(0, $retryTimes ?? (int) config('services.heygen.retry_times', 2));

        $request = Http::baseUrl((string) config('services.heygen.base_url'))
            ->acceptJson()
            ->timeout($timeout)
            ->connectTimeout(min(10, $timeout))
            ->withHeaders([
                'X-Api-Key' => $apiKey,
            ]);

        if ($retries > 0) {
            $request = $request->retry(
                times: $retries,
                sleepMilliseconds: (int) config('services.heygen.retry_sleep_ms', 250),
            );
        }

        return $request;
    }
}
