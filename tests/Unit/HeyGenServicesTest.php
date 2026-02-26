<?php

use App\Models\User;
use App\Services\HeyGen\HeyGenQuotaException;
use App\Services\HeyGen\HeyGenQuotaService;
use App\Services\HeyGen\HeyGenWebhookSignatureService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;

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
