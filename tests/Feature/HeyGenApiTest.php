<?php

use App\Jobs\ProcessHeyGenWebhookEventJob;
use App\Jobs\SubmitHeyGenVideoJob;
use App\Models\HeyGenVideoJob;
use App\Models\HeyGenWebhookEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('video creation endpoint requires auth', function () {
    $this->postJson('/api/heygen/videos', [
        'avatar_id' => 'avatar_1',
        'voice_id' => 'voice_1',
        'script' => 'Hello world',
    ])->assertUnauthorized();
});

test('authenticated user can queue a heygen video job', function () {
    Queue::fake();
    $user = User::factory()->create([
        'email_verified_at' => now(),
    ]);
    Sanctum::actingAs($user);

    $response = $this->postJson('/api/heygen/videos', [
        'avatar_id' => 'avatar_1',
        'voice_id' => 'voice_1',
        'script' => 'Hello from QuinsAI',
    ]);

    $response->assertAccepted()
        ->assertJsonPath('data.status', 'queued');

    $videoJob = HeyGenVideoJob::query()->first();
    expect($videoJob)->not->toBeNull();
    expect($videoJob?->user_id)->toBe($user->id);

    Queue::assertPushed(SubmitHeyGenVideoJob::class, 1);
});

test('video detail is scoped to owner', function () {
    $owner = User::factory()->create(['email_verified_at' => now()]);
    $other = User::factory()->create(['email_verified_at' => now()]);

    $videoJob = HeyGenVideoJob::query()->create([
        'user_id' => $owner->id,
        'avatar_id' => 'avatar_1',
        'voice_id' => 'voice_1',
        'script' => 'Private video job',
        'status' => 'queued',
    ]);

    Sanctum::actingAs($other);

    $this->getJson("/api/heygen/videos/{$videoJob->id}")
        ->assertNotFound();
});

test('quota blocks requests when daily limit is reached', function () {
    Queue::fake();
    config()->set('services.heygen.daily_request_limit', 1);

    $user = User::factory()->create(['email_verified_at' => now()]);
    Sanctum::actingAs($user);

    $this->postJson('/api/heygen/videos', [
        'avatar_id' => 'avatar_1',
        'voice_id' => 'voice_1',
        'script' => 'First request',
    ])->assertAccepted();

    $this->postJson('/api/heygen/videos', [
        'avatar_id' => 'avatar_1',
        'voice_id' => 'voice_1',
        'script' => 'Second request',
    ])->assertTooManyRequests();
});

test('unverified users cannot access heygen api', function () {
    Queue::fake();
    $user = User::factory()->create([
        'email_verified_at' => null,
    ]);
    Sanctum::actingAs($user);

    $this->postJson('/api/heygen/videos', [
        'avatar_id' => 'avatar_1',
        'voice_id' => 'voice_1',
        'script' => 'Blocked due to unverified email.',
    ])->assertForbidden()
        ->assertJsonPath('error.code', 'email_unverified');

    Queue::assertNothingPushed();
});

test('webhook is idempotent and only queues processing once', function () {
    Queue::fake();
    config()->set('services.heygen.webhook_secret', 'test-secret');

    HeyGenVideoJob::query()->create([
        'user_id' => User::factory()->create()->id,
        'provider_video_id' => 'provider-video-123',
        'avatar_id' => 'avatar_1',
        'voice_id' => 'voice_1',
        'script' => 'Webhook test',
        'status' => 'processing',
    ]);

    $payload = [
        'event_id' => 'evt_123',
        'event_type' => 'video.completed',
        'data' => [
            'video_id' => 'provider-video-123',
            'status' => 'completed',
            'video_url' => 'https://cdn.example.com/video.mp4',
        ],
    ];

    $rawBody = json_encode($payload, JSON_THROW_ON_ERROR);
    $signature = hash_hmac('sha256', $rawBody, 'test-secret');

    $this->postJson('/api/webhooks/heygen', $payload, [
        'X-HeyGen-Signature' => $signature,
    ])->assertAccepted();

    $this->postJson('/api/webhooks/heygen', $payload, [
        'X-HeyGen-Signature' => $signature,
    ])->assertAccepted();

    expect(HeyGenWebhookEvent::query()->count())->toBe(1);
    Queue::assertPushed(ProcessHeyGenWebhookEventJob::class, 1);
});
