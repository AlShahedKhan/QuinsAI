<?php

use App\Domain\HeyGen\HeyGenLiveSessionWorkflowService;
use App\Models\HeyGenLiveSession;
use App\Models\HeyGenUsageDaily;
use App\Models\User;
use App\Services\HeyGen\HeyGenClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Mockery\MockInterface;

uses(RefreshDatabase::class);

test('live session creation endpoint requires auth', function () {
    $this->postJson('/api/heygen/live/sessions', [
        'avatar_id' => 'avatar_1',
        'voice_id' => 'voice_1',
        'quality' => 'high',
    ])->assertUnauthorized();
});

test('authenticated user can create a live session and receive live quota', function () {
    $user = User::factory()->create([
        'email_verified_at' => now(),
    ]);

    Sanctum::actingAs($user);

    $this->mock(HeyGenLiveSessionWorkflowService::class, function (MockInterface $mock) use ($user): void {
        $mock->shouldReceive('createSession')
            ->once()
            ->andReturn(HeyGenLiveSession::query()->create([
                'user_id' => $user->id,
                'provider_session_id' => 'provider-session-1',
                'status' => 'created',
                'token_expires_at' => now()->addMinutes(10),
                'metadata' => [
                    'token' => 'test-token',
                    'ice_servers' => [],
                    'session_response' => [],
                ],
            ]));
    });

    $this->postJson('/api/heygen/live/sessions', [
        'avatar_id' => 'avatar_1',
        'voice_id' => 'voice_1',
        'quality' => 'high',
    ])->assertCreated()
        ->assertJsonPath('data.status', 'created')
        ->assertJsonPath('data.token', 'test-token')
        ->assertJsonPath('quota.daily_live_minute_limit', 30)
        ->assertJsonPath('quota.live_minutes_used', 0)
        ->assertJsonPath('quota.live_minutes_remaining', 30);
});

test('live session creation is blocked when live minute quota is exhausted', function () {
    $user = User::factory()->create([
        'email_verified_at' => now(),
    ]);

    HeyGenUsageDaily::query()->create([
        'user_id' => $user->id,
        'usage_date' => now()->toDateString(),
        'video_requests' => 0,
        'digital_twin_requests' => 0,
        'live_session_minutes' => 5,
        'cost_units' => 0,
        'daily_request_limit' => 5,
        'daily_digital_twin_limit' => 1,
        'daily_minute_limit' => 5,
    ]);

    Sanctum::actingAs($user);

    $this->mock(HeyGenLiveSessionWorkflowService::class, function (MockInterface $mock): void {
        $mock->shouldReceive('createSession')->never();
    });

    $this->postJson('/api/heygen/live/sessions', [
        'avatar_id' => 'avatar_1',
        'voice_id' => 'voice_1',
        'quality' => 'high',
    ])->assertTooManyRequests()
        ->assertJsonPath('error.code', 'quota_exceeded');
});

test('live quota endpoint returns used and remaining minutes', function () {
    $user = User::factory()->create([
        'email_verified_at' => now(),
    ]);

    HeyGenUsageDaily::query()->create([
        'user_id' => $user->id,
        'usage_date' => now()->toDateString(),
        'video_requests' => 0,
        'digital_twin_requests' => 0,
        'live_session_minutes' => 7,
        'cost_units' => 0,
        'daily_request_limit' => 5,
        'daily_digital_twin_limit' => 1,
        'daily_minute_limit' => 30,
    ]);

    Sanctum::actingAs($user);

    $this->getJson('/api/heygen/live/quota')
        ->assertOk()
        ->assertJsonPath('data.daily_live_minute_limit', 30)
        ->assertJsonPath('data.live_minutes_used', 7)
        ->assertJsonPath('data.live_minutes_remaining', 23);
});

test('live session activate marks the session active for the owner', function () {
    $user = User::factory()->create([
        'email_verified_at' => now(),
    ]);

    $liveSession = HeyGenLiveSession::query()->create([
        'user_id' => $user->id,
        'provider_session_id' => 'provider-session-2',
        'status' => 'created',
        'metadata' => [
            'token' => 'activate-token',
        ],
    ]);

    Sanctum::actingAs($user);

    $this->postJson("/api/heygen/live/sessions/{$liveSession->id}/activate")
        ->assertOk()
        ->assertJsonPath('data.status', 'active');

    expect($liveSession->refresh()->started_at)->not->toBeNull();
});

test('live session end is scoped to the owner', function () {
    $owner = User::factory()->create(['email_verified_at' => now()]);
    $other = User::factory()->create(['email_verified_at' => now()]);

    $liveSession = HeyGenLiveSession::query()->create([
        'user_id' => $owner->id,
        'provider_session_id' => 'provider-session-3',
        'status' => 'active',
        'started_at' => now()->subMinutes(3),
        'metadata' => [
            'token' => 'owner-token',
        ],
    ]);

    Sanctum::actingAs($other);

    $this->postJson("/api/heygen/live/sessions/{$liveSession->id}/end")
        ->assertNotFound();
});

test('ending an active live session records used minutes once and returns updated quota', function () {
    $user = User::factory()->create([
        'email_verified_at' => now(),
    ]);

    $liveSession = HeyGenLiveSession::query()->create([
        'user_id' => $user->id,
        'provider_session_id' => 'provider-session-4',
        'status' => 'active',
        'started_at' => now()->subMinutes(3),
        'metadata' => [
            'token' => 'end-token',
        ],
    ]);

    Sanctum::actingAs($user);

    $this->mock(HeyGenClient::class, function (MockInterface $mock): void {
        $mock->shouldReceive('endLiveSession')
            ->once()
            ->andReturn([]);
    });

    $this->postJson("/api/heygen/live/sessions/{$liveSession->id}/end")
        ->assertOk()
        ->assertJsonPath('data.status', 'ended')
        ->assertJsonPath('quota.live_minutes_used', 3)
        ->assertJsonPath('quota.live_minutes_remaining', 27);
});
