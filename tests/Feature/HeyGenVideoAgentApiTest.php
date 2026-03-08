<?php

use App\Domain\HeyGen\HeyGenDigitalTwinWorkflowService;
use App\Domain\HeyGen\HeyGenVideoAgentWorkflowService;
use App\Domain\HeyGen\HeyGenVideoWorkflowService;
use App\Jobs\ProcessHeyGenWebhookEventJob;
use App\Jobs\SubmitHeyGenVideoAgentJob;
use App\Models\HeyGenVideoAgentJob;
use App\Models\HeyGenWebhookEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function actingAsVideoAgentAdmin(): User
{
    $admin = User::factory()->admin()->create([
        'email_verified_at' => now(),
    ]);
    Sanctum::actingAs($admin);

    return $admin;
}

test('video agent creation endpoint requires auth', function () {
    $this->postJson('/api/admin/heygen/video-agent/videos', [
        'prompt' => 'Create a product launch video for a finance app.',
    ])->assertUnauthorized();
});

test('non admin user cannot access video agent endpoints', function () {
    $user = User::factory()->create([
        'email_verified_at' => now(),
    ]);
    Sanctum::actingAs($user);

    $this->postJson('/api/admin/heygen/video-agent/videos', [
        'prompt' => 'Create a product launch video for a finance app.',
    ])->assertForbidden();
});

test('admin can queue a heygen video agent job', function () {
    Queue::fake();
    $admin = actingAsVideoAgentAdmin();

    $response = $this->postJson('/api/admin/heygen/video-agent/videos', [
        'prompt' => 'Create a short product launch video for QuinsAI with a confident presenter and clear CTA.',
    ]);

    $response->assertAccepted()
        ->assertJsonPath('data.status', 'queued');

    $job = HeyGenVideoAgentJob::query()->first();
    expect($job)->not->toBeNull();
    expect($job?->user_id)->toBe($admin->id);
    expect($job?->prompt)->toContain('QuinsAI');

    Queue::assertPushed(SubmitHeyGenVideoAgentJob::class, 1);
});

test('video agent detail is scoped to owner', function () {
    $owner = User::factory()->admin()->create(['email_verified_at' => now()]);
    $other = User::factory()->admin()->create(['email_verified_at' => now()]);

    $job = HeyGenVideoAgentJob::query()->create([
        'user_id' => $owner->id,
        'prompt' => 'Private prompt to video job.',
        'status' => 'queued',
    ]);

    Sanctum::actingAs($other);

    $this->getJson("/api/admin/heygen/video-agent/videos/{$job->id}")
        ->assertNotFound();
});

test('video agent requests share the daily heygen video quota', function () {
    Queue::fake();
    config()->set('services.heygen.daily_request_limit', 1);

    actingAsVideoAgentAdmin();

    $this->postJson('/api/admin/heygen/video-agent/videos', [
        'prompt' => 'First agent request.',
    ])->assertAccepted();

    $this->postJson('/api/admin/heygen/video-agent/videos', [
        'prompt' => 'Second agent request.',
    ])->assertTooManyRequests();
});

test('video agent prompt safety rules are enforced', function () {
    Queue::fake();
    config()->set('services.heygen.video_agent_prompt_blocklist', ['forbidden']);

    actingAsVideoAgentAdmin();

    $this->postJson('/api/admin/heygen/video-agent/videos', [
        'prompt' => 'This prompt contains forbidden content.',
    ])->assertUnprocessable();

    Queue::assertNothingPushed();
});

test('video agent success webhook payload with event_data marks job completed', function () {
    Queue::fake();

    $job = HeyGenVideoAgentJob::query()->create([
        'user_id' => User::factory()->create()->id,
        'provider_video_id' => 'provider-agent-123',
        'prompt' => 'Create a launch video.',
        'status' => 'processing',
    ]);

    $event = HeyGenWebhookEvent::query()->create([
        'provider_event_id' => 'evt_agent_success',
        'event_type' => 'video_agent.success',
        'signature_valid' => true,
        'payload' => [
            'event_id' => 'evt_agent_success',
            'event_type' => 'video_agent.success',
            'event_data' => [
                'video_id' => 'provider-agent-123',
                'url' => 'https://cdn.example.com/video-agent.mp4',
            ],
        ],
        'received_at' => now(),
    ]);

    (new ProcessHeyGenWebhookEventJob($event->id))->handle(
        app(HeyGenVideoWorkflowService::class),
        app(HeyGenDigitalTwinWorkflowService::class),
        app(HeyGenVideoAgentWorkflowService::class),
    );

    $job->refresh();
    $event->refresh();

    expect($job->status->value)->toBe('completed');
    expect($job->output_provider_url)->toBe('https://cdn.example.com/video-agent.mp4');
    expect($event->processing_error)->toBeNull();
});
