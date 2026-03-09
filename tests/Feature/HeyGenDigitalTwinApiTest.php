<?php

use App\Jobs\SubmitHeyGenDigitalTwinJob;
use App\Models\HeyGenDigitalTwin;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('digital twin creation endpoint requires auth', function () {
    Storage::fake('local');
    config()->set('services.heygen.digital_twin_upload_disk', 'local');

    $this->post('/api/heygen/digital-twins', [
        'avatar_name' => 'Test Twin',
        'training_footage' => UploadedFile::fake()->create('training.mp4', 10, 'video/mp4'),
        'video_consent' => UploadedFile::fake()->create('consent.mp4', 10, 'video/mp4'),
    ], [
        'Accept' => 'application/json',
    ])->assertUnauthorized();
});

test('authenticated user can submit a digital twin request', function () {
    Queue::fake();
    Storage::fake('local');
    config()->set('services.heygen.digital_twin_upload_disk', 'local');

    $user = User::factory()->create([
        'email_verified_at' => now(),
    ]);

    Sanctum::actingAs($user);

    $response = $this->post('/api/heygen/digital-twins', [
        'avatar_name' => 'Abdullah Twin',
        'training_footage' => UploadedFile::fake()->create('training.mp4', 10, 'video/mp4'),
        'video_consent' => UploadedFile::fake()->create('consent.mp4', 10, 'video/mp4'),
    ], [
        'Accept' => 'application/json',
    ]);

    $response->assertAccepted()
        ->assertJsonPath('data.status', 'queued');

    $digitalTwin = HeyGenDigitalTwin::query()->first();
    expect($digitalTwin)->not->toBeNull();
    expect($digitalTwin?->user_id)->toBe($user->id);
    expect($digitalTwin?->training_video_path)->not->toBe('');
    expect($digitalTwin?->consent_video_path)->not->toBe('');

    Storage::disk('local')->assertExists((string) $digitalTwin?->training_video_path);
    Storage::disk('local')->assertExists((string) $digitalTwin?->consent_video_path);

    Queue::assertPushed(SubmitHeyGenDigitalTwinJob::class, 1);
});

test('digital twin detail is scoped to owner', function () {
    $owner = User::factory()->create(['email_verified_at' => now()]);
    $other = User::factory()->create(['email_verified_at' => now()]);

    $digitalTwin = HeyGenDigitalTwin::query()->create([
        'user_id' => $owner->id,
        'avatar_name' => 'Private Twin',
        'training_video_path' => 'private/t1.mp4',
        'consent_video_path' => 'private/c1.mp4',
        'status' => 'queued',
    ]);

    Sanctum::actingAs($other);

    $this->getJson("/api/heygen/digital-twins/{$digitalTwin->id}")
        ->assertNotFound();
});

test('digital twin index supports status filters and custom page size', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $other = User::factory()->create(['email_verified_at' => now()]);

    HeyGenDigitalTwin::query()->create([
        'user_id' => $user->id,
        'avatar_name' => 'Completed Twin A',
        'training_video_path' => 'private/a-training.mp4',
        'consent_video_path' => 'private/a-consent.mp4',
        'status' => 'completed',
        'provider_avatar_id' => 'avatar-a',
    ]);

    HeyGenDigitalTwin::query()->create([
        'user_id' => $user->id,
        'avatar_name' => 'Processing Twin',
        'training_video_path' => 'private/b-training.mp4',
        'consent_video_path' => 'private/b-consent.mp4',
        'status' => 'processing',
    ]);

    HeyGenDigitalTwin::query()->create([
        'user_id' => $user->id,
        'avatar_name' => 'Completed Twin B',
        'training_video_path' => 'private/c-training.mp4',
        'consent_video_path' => 'private/c-consent.mp4',
        'status' => 'completed',
        'provider_avatar_id' => 'avatar-c',
    ]);

    HeyGenDigitalTwin::query()->create([
        'user_id' => $other->id,
        'avatar_name' => 'Other User Twin',
        'training_video_path' => 'private/d-training.mp4',
        'consent_video_path' => 'private/d-consent.mp4',
        'status' => 'completed',
        'provider_avatar_id' => 'avatar-d',
    ]);

    Sanctum::actingAs($user);

    $response = $this->getJson('/api/heygen/digital-twins?status=completed&per_page=1');

    $response->assertOk()
        ->assertJsonPath('per_page', 1)
        ->assertJsonPath('total', 2)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.status', 'completed');
});

test('digital twin quota blocks requests when daily limit is reached', function () {
    Queue::fake();
    Storage::fake('local');
    config()->set('services.heygen.digital_twin_upload_disk', 'local');
    config()->set('services.heygen.digital_twin_daily_request_limit', 1);

    $user = User::factory()->create(['email_verified_at' => now()]);
    Sanctum::actingAs($user);

    $this->post('/api/heygen/digital-twins', [
        'avatar_name' => 'First Twin',
        'training_footage' => UploadedFile::fake()->create('training-1.mp4', 10, 'video/mp4'),
        'video_consent' => UploadedFile::fake()->create('consent-1.mp4', 10, 'video/mp4'),
    ], ['Accept' => 'application/json'])->assertAccepted();

    $this->post('/api/heygen/digital-twins', [
        'avatar_name' => 'Second Twin',
        'training_footage' => UploadedFile::fake()->create('training-2.mp4', 10, 'video/mp4'),
        'video_consent' => UploadedFile::fake()->create('consent-2.mp4', 10, 'video/mp4'),
    ], ['Accept' => 'application/json'])->assertTooManyRequests();
});

test('digital twin signed media route allows signed requests only', function () {
    Storage::fake('local');
    config()->set('services.heygen.digital_twin_upload_disk', 'local');

    $user = User::factory()->create();
    $trainingPath = 'heygen/digital-twins/user-'.$user->id.'/training-file.mp4';
    $consentPath = 'heygen/digital-twins/user-'.$user->id.'/consent-file.mp4';

    Storage::disk('local')->put($trainingPath, 'training');
    Storage::disk('local')->put($consentPath, 'consent');

    $digitalTwin = HeyGenDigitalTwin::query()->create([
        'user_id' => $user->id,
        'avatar_name' => 'Signed Media Twin',
        'training_video_path' => $trainingPath,
        'consent_video_path' => $consentPath,
        'status' => 'queued',
    ]);

    $signedUrl = URL::temporarySignedRoute('heygen.digital-twins.media', now()->addMinutes(10), [
        'digitalTwin' => $digitalTwin->id,
        'kind' => 'training',
    ]);

    $this->get($signedUrl)->assertOk();
    $this->get("/api/heygen/digital-twins/media/{$digitalTwin->id}/training")->assertForbidden();
});
