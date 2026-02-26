<?php

namespace App\Domain\HeyGen;

use App\Domain\HeyGen\Enums\LiveSessionStatus;
use App\Models\HeyGenLiveSession;
use App\Models\User;
use App\Services\HeyGen\HeyGenClient;
use Illuminate\Support\Arr;

class HeyGenLiveSessionWorkflowService
{
    public function __construct(
        private readonly HeyGenClient $client,
    ) {
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function createSession(User $user, array $payload): HeyGenLiveSession
    {
        $tokenResponse = $this->client->createStreamingToken((string) $user->id);
        $tokenData = (array) ($tokenResponse['data'] ?? $tokenResponse);

        $sessionResponse = $this->client->createLiveSession([
            'avatar_id' => (string) $payload['avatar_id'],
            'voice_id' => (string) $payload['voice_id'],
            'quality' => (string) ($payload['quality'] ?? 'high'),
        ]);
        $sessionData = (array) ($sessionResponse['data'] ?? $sessionResponse);

        return HeyGenLiveSession::query()->create([
            'user_id' => $user->id,
            'provider_session_id' => (string) (
                $sessionData['session_id']
                ?? $sessionData['sessionId']
                ?? ''
            ) ?: null,
            'status' => LiveSessionStatus::Created,
            'token_expires_at' => now()->addMinutes(10),
            'started_at' => now(),
            'metadata' => [
                'token' => $tokenData['token'] ?? $tokenData['access_token'] ?? null,
                'token_response' => $tokenResponse,
                'session_response' => $sessionResponse,
                'ice_servers' => Arr::get($sessionData, 'ice_servers', []),
            ],
        ]);
    }

    public function endSession(HeyGenLiveSession $liveSession): HeyGenLiveSession
    {
        if ($liveSession->provider_session_id !== null && $liveSession->provider_session_id !== '') {
            $this->client->endLiveSession($liveSession->provider_session_id);
        }

        $liveSession->status = LiveSessionStatus::Ended;
        $liveSession->ended_at = now();
        $liveSession->save();

        return $liveSession;
    }
}
