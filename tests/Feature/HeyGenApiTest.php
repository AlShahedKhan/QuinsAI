<?php

use App\Jobs\ProcessHeyGenWebhookEventJob;
use App\Jobs\SubmitHeyGenVideoJob;
use App\Models\HeyGenPublicAvatar;
use App\Models\HeyGenVideoJob;
use App\Models\HeyGenWebhookEvent;
use App\Models\User;
use App\Services\HeyGen\HeyGenCatalogService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use Mockery\MockInterface;

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

test('unverified users can access heygen api when authenticated', function () {
    Queue::fake();
    $user = User::factory()->create([
        'email_verified_at' => null,
    ]);
    Sanctum::actingAs($user);

    $this->postJson('/api/heygen/videos', [
        'avatar_id' => 'avatar_1',
        'voice_id' => 'voice_1',
        'script' => 'Allowed without email verification.',
    ])->assertAccepted()
        ->assertJsonPath('data.status', 'queued');

    Queue::assertPushed(SubmitHeyGenVideoJob::class, 1);
});

test('catalog endpoint can fetch avatars only without voices', function () {
    $user = User::factory()->create([
        'email_verified_at' => null,
    ]);
    Sanctum::actingAs($user);

    $this->mock(HeyGenCatalogService::class, function (MockInterface $mock): void {
        $mock->shouldReceive('getAvatars')
            ->once()
            ->andReturn([
                ['avatar_id' => 'avatar_1'],
            ]);
        $mock->shouldReceive('getVoices')->never();
        $mock->shouldReceive('getCatalog')->never();
    });

    $this->getJson('/api/heygen/catalog?include=avatars')
        ->assertOk()
        ->assertJsonPath('data.avatars.0.avatar_id', 'avatar_1')
        ->assertJsonPath('data.voices', []);
});

test('public avatars endpoint returns paginated local avatar catalog', function () {
    $user = User::factory()->create([
        'email_verified_at' => null,
    ]);
    Sanctum::actingAs($user);

    HeyGenPublicAvatar::query()->create([
        'provider_avatar_id' => 'avatar_annie',
        'name' => 'Annie',
        'preview_image_url' => 'https://cdn.example.com/annie.jpg',
        'looks_count' => 15,
        'categories' => ['Professional'],
        'search_text' => 'annie avatar_annie professional',
        'is_active' => true,
        'synced_at' => now(),
    ]);

    HeyGenPublicAvatar::query()->create([
        'provider_avatar_id' => 'avatar_inactive',
        'name' => 'Inactive',
        'categories' => ['Lifestyle'],
        'is_active' => false,
    ]);

    $this->getJson('/api/heygen/public-avatars?search=annie&category=Professional&per_page=50')
        ->assertOk()
        ->assertJsonPath('data.0.avatar_id', 'avatar_annie')
        ->assertJsonPath('data.0.display_name', 'Annie')
        ->assertJsonPath('total', 1)
        ->assertJsonPath('meta.categories.0', 'Professional');
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
