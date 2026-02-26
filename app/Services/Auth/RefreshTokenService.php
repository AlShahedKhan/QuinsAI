<?php

namespace App\Services\Auth;

use App\Models\AuthRefreshToken;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Cookie;

class RefreshTokenService
{
    private const DEFAULT_COOKIE_NAME = 'refresh_token';

    /**
     * @return array{user: User, refresh_token: string}
     */
    public function rotateFromRequest(Request $request): array
    {
        $raw = $this->extractTokenFromRequest($request);
        if ($raw === null) {
            throw new InvalidRefreshTokenException('Refresh token is missing.');
        }

        $existing = $this->findActiveByPlainToken($raw);
        if ($existing === null) {
            throw new InvalidRefreshTokenException('Refresh token is invalid or expired.');
        }

        return DB::transaction(function () use ($existing, $request): array {
            $newToken = $this->createTokenRecord($existing->user, $request);

            $existing->revoked_at = now();
            $existing->replaced_by_id = $newToken['model']->id;
            $existing->save();

            return [
                'user' => $existing->user,
                'refresh_token' => $newToken['plain'],
            ];
        });
    }

    public function issue(User $user, Request $request): string
    {
        $newToken = $this->createTokenRecord($user, $request);

        return $newToken['plain'];
    }

    public function revokeFromRequest(Request $request): void
    {
        $raw = $this->extractTokenFromRequest($request);
        if ($raw === null) {
            return;
        }

        $existing = $this->findActiveByPlainToken($raw);
        if ($existing === null) {
            return;
        }

        $existing->revoked_at = now();
        $existing->save();
    }

    public function revokeAllForUser(User $user): void
    {
        AuthRefreshToken::query()
            ->where('user_id', $user->id)
            ->whereNull('revoked_at')
            ->update(['revoked_at' => now()]);
    }

    public function makeCookie(string $plainRefreshToken): Cookie
    {
        return cookie(
            name: $this->cookieName(),
            value: $plainRefreshToken,
            minutes: $this->refreshTokenTtlDays() * 24 * 60,
            path: '/api/auth',
            domain: $this->cookieDomain(),
            secure: $this->cookieSecure(),
            httpOnly: true,
            raw: false,
            sameSite: 'strict',
        );
    }

    public function forgetCookie(): Cookie
    {
        return cookie(
            name: $this->cookieName(),
            value: '',
            minutes: -1,
            path: '/api/auth',
            domain: $this->cookieDomain(),
            secure: $this->cookieSecure(),
            httpOnly: true,
            raw: false,
            sameSite: 'strict',
        );
    }

    private function extractTokenFromRequest(Request $request): ?string
    {
        $value = $request->cookie($this->cookieName());

        if (! is_string($value) || $value === '') {
            $value = $request->input($this->cookieName()) ?: $request->input('refresh_token');
        }

        if (! is_string($value) || $value === '') {
            return null;
        }

        return trim($value, "\"'");
    }

    private function findActiveByPlainToken(string $plain): ?AuthRefreshToken
    {
        return AuthRefreshToken::query()
            ->where('token_hash', $this->hashToken($plain))
            ->whereNull('revoked_at')
            ->where('expires_at', '>', now())
            ->with('user')
            ->first();
    }

    /**
     * @return array{plain: string, model: AuthRefreshToken}
     */
    private function createTokenRecord(User $user, Request $request): array
    {
        $plain = Str::random(96);

        $model = AuthRefreshToken::query()->create([
            'user_id' => $user->id,
            'token_hash' => $this->hashToken($plain),
            'expires_at' => now()->addDays($this->refreshTokenTtlDays()),
            'ip_address' => $request->ip(),
            'user_agent' => Str::limit((string) $request->userAgent(), 1024, ''),
        ]);

        return [
            'plain' => $plain,
            'model' => $model,
        ];
    }

    private function hashToken(string $plain): string
    {
        return hash('sha256', $plain);
    }

    private function cookieName(): string
    {
        return (string) config('auth.refresh.cookie_name', self::DEFAULT_COOKIE_NAME);
    }

    private function refreshTokenTtlDays(): int
    {
        return max(1, (int) config('auth.refresh.ttl_days', 30));
    }

    private function cookieSecure(): bool
    {
        return (bool) config('auth.refresh.cookie_secure', true);
    }

    private function cookieDomain(): ?string
    {
        $domain = config('auth.refresh.cookie_domain');

        return is_string($domain) && $domain !== '' ? $domain : null;
    }
}
