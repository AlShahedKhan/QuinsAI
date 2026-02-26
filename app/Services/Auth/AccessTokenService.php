<?php

namespace App\Services\Auth;

use App\Models\User;
use Illuminate\Http\Request;
use Laravel\Sanctum\NewAccessToken;

class AccessTokenService
{
    /**
     * @return array{access_token: string, token_type: string, expires_in: int}
     */
    public function issue(User $user, string $name = 'api-access'): array
    {
        $ttlMinutes = $this->accessTokenTtlMinutes();
        $expiresAt = now()->addMinutes($ttlMinutes);

        /** @var NewAccessToken $token */
        $token = $user->createToken($name, ['*'], $expiresAt);

        return [
            'access_token' => $token->plainTextToken,
            'token_type' => 'Bearer',
            'expires_in' => $ttlMinutes * 60,
        ];
    }

    public function revokeCurrent(Request $request): void
    {
        $request->user()?->currentAccessToken()?->delete();
    }

    public function revokeAll(User $user): void
    {
        $user->tokens()->delete();
    }

    private function accessTokenTtlMinutes(): int
    {
        $ttl = (int) config('sanctum.expiration', 15);
        return max(1, $ttl);
    }
}
