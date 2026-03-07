<?php

use App\Models\User;
use App\Models\HeyGenPublicAvatar;
use App\Services\HeyGen\HeyGenPublicAvatarSyncService;
use App\Services\HeyGen\HeyGenQuotaException;
use App\Services\HeyGen\HeyGenQuotaService;
use App\Services\HeyGen\HeyGenWebhookSignatureService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

test('webhook signature verification passes with valid signature', function () {
    config()->set('services.heygen.webhook_secret', 'unit-secret');

    $payload = ['event_id' => 'evt_unit', 'event_type' => 'video.completed'];
    $rawBody = json_encode($payload, JSON_THROW_ON_ERROR);
    $signature = hash_hmac('sha256', $rawBody, 'unit-secret');

    $request = Request::create('/api/webhooks/heygen', 'POST', [], [], [], [], $rawBody);
    $request->headers->set('X-HeyGen-Signature', $signature);

    $service = app(HeyGenWebhookSignatureService::class);
    expect($service->isValid($request))->toBeTrue();
});

test('webhook signature verification fails with invalid signature', function () {
    config()->set('services.heygen.webhook_secret', 'unit-secret');

    $request = Request::create('/api/webhooks/heygen', 'POST', [], [], [], [], '{"x":1}');
    $request->headers->set('X-HeyGen-Signature', 'invalid');

    $service = app(HeyGenWebhookSignatureService::class);
    expect($service->isValid($request))->toBeFalse();
});

test('quota service enforces daily request limit', function () {
    config()->set('services.heygen.daily_request_limit', 1);

    $user = User::factory()->create();
    $service = app(HeyGenQuotaService::class);

    $service->consumeVideoRequest($user);

    $thrown = false;
    try {
        $service->consumeVideoRequest($user);
    } catch (HeyGenQuotaException) {
        $thrown = true;
    }

    expect($thrown)->toBeTrue();
});

test('public avatar sync stores provider avatars locally and deactivates missing entries', function () {
    config()->set('services.heygen.api_key', 'test-key');
    config()->set('services.heygen.base_url', 'https://api.heygen.com');

    HeyGenPublicAvatar::query()->create([
        'provider_avatar_id' => 'avatar_old',
        'name' => 'Old Avatar',
        'is_active' => true,
    ]);

    Http::fake([
        'https://api.heygen.com/v2/avatars*' => Http::response([
            'code' => 100,
            'data' => [
                'avatars' => [
                    [
                        'avatar_id' => 'avatar_annie',
                        'display_name' => 'Annie',
                        'preview_image_url' => 'https://cdn.example.com/annie.jpg',
                        'looks' => 12,
                        'categories' => ['Professional'],
                    ],
                ],
            ],
        ], 200),
    ]);

    $summary = app(HeyGenPublicAvatarSyncService::class)->sync();

    expect($summary['synced'])->toBe(1);
    expect($summary['deactivated'])->toBe(1);

    $avatar = HeyGenPublicAvatar::query()->where('provider_avatar_id', 'avatar_annie')->first();
    expect($avatar)->not->toBeNull();
    expect($avatar?->name)->toBe('Annie');
    expect($avatar?->is_active)->toBeTrue();
    expect($avatar?->categories)->toBe(['Professional']);

    expect(
        HeyGenPublicAvatar::query()->where('provider_avatar_id', 'avatar_old')->value('is_active')
    )->toBeFalse();
});
