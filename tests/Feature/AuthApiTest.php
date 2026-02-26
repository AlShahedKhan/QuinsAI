<?php

use App\Models\AuthRefreshToken;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\PersonalAccessToken;

uses(RefreshDatabase::class);

function refreshCookieFromResponse(\Illuminate\Testing\TestResponse $response): ?string
{
    $cookieName = config('auth.refresh.cookie_name', 'refresh_token');

    foreach ($response->headers->getCookies() as $cookie) {
        if ($cookie->getName() === $cookieName) {
            return $cookie->getValue();
        }
    }

    return null;
}

test('register completes without sending verification notification', function () {
    Notification::fake();

    $response = $this->postJson('/api/auth/register', [
        'name' => 'New User',
        'email' => 'new-user@example.com',
        'password' => 'StrongPass#123',
        'password_confirmation' => 'StrongPass#123',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.verification_sent', false);

    $user = User::query()->where('email', 'new-user@example.com')->first();
    expect($user)->not->toBeNull();

    Notification::assertNothingSent();
});

test('login returns access token and refresh cookie', function () {
    $user = User::factory()->create([
        'password' => 'StrongPass#123',
        'email_verified_at' => now(),
    ]);

    $response = $this->postJson('/api/auth/login', [
        'email' => $user->email,
        'password' => 'StrongPass#123',
    ]);

    $response->assertOk()
        ->assertJsonPath('data.token_type', 'Bearer')
        ->assertJsonPath('data.user.id', $user->id);

    $cookie = refreshCookieFromResponse($response);
    expect($cookie)->not->toBeNull();
    expect(AuthRefreshToken::query()->count())->toBe(1);
    expect(PersonalAccessToken::query()->count())->toBe(1);
});

test('refresh rotates refresh token and returns new access token', function () {
    $user = User::factory()->create([
        'password' => 'StrongPass#123',
        'email_verified_at' => now(),
    ]);

    $login = $this->postJson('/api/auth/login', [
        'email' => $user->email,
        'password' => 'StrongPass#123',
    ])->assertOk();

    $oldRefreshToken = refreshCookieFromResponse($login);
    expect($oldRefreshToken)->not->toBeNull();

    $refresh = $this
        ->withCookie((string) config('auth.refresh.cookie_name', 'refresh_token'), (string) $oldRefreshToken)
        ->postJson('/api/auth/refresh', [
            'refresh_token' => (string) $oldRefreshToken,
        ])
        ->assertOk();

    $newRefreshToken = refreshCookieFromResponse($refresh);
    expect($newRefreshToken)->not->toBeNull();
    expect($newRefreshToken)->not->toBe($oldRefreshToken);

    $records = AuthRefreshToken::query()->orderBy('id')->get();
    expect($records)->toHaveCount(2);
    expect($records[0]->revoked_at)->not->toBeNull();
    expect($records[0]->replaced_by_id)->toBe($records[1]->id);
});

test('logout revokes current access token and refresh token', function () {
    $user = User::factory()->create([
        'password' => 'StrongPass#123',
        'email_verified_at' => now(),
    ]);

    $login = $this->postJson('/api/auth/login', [
        'email' => $user->email,
        'password' => 'StrongPass#123',
    ])->assertOk();

    $accessToken = (string) $login->json('data.access_token');
    $refreshToken = (string) refreshCookieFromResponse($login);

    $this->withToken($accessToken)
        ->withCookie((string) config('auth.refresh.cookie_name', 'refresh_token'), $refreshToken)
        ->postJson('/api/auth/logout', [
            'refresh_token' => $refreshToken,
        ])
        ->assertOk();

    expect(PersonalAccessToken::query()->count())->toBe(0);
    expect(AuthRefreshToken::query()->whereNull('revoked_at')->count())->toBe(0);
});

test('unverified user can login and access heygen api', function () {
    Queue::fake();

    $user = User::factory()->create([
        'password' => 'StrongPass#123',
        'email_verified_at' => null,
    ]);

    $login = $this->postJson('/api/auth/login', [
        'email' => $user->email,
        'password' => 'StrongPass#123',
    ])->assertOk();

    $accessToken = (string) $login->json('data.access_token');

    $this->withToken($accessToken)
        ->postJson('/api/heygen/videos', [
            'avatar_id' => 'avatar_1',
            'voice_id' => 'voice_1',
            'script' => 'Unverified access check',
        ])
        ->assertAccepted()
        ->assertJsonPath('data.status', 'queued');

    Queue::assertPushed(\App\Jobs\SubmitHeyGenVideoJob::class, 1);
});
