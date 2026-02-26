<?php

use App\Http\Controllers\Api\HeyGen\CatalogController;
use App\Http\Controllers\Api\HeyGen\LiveSessionController;
use App\Http\Controllers\Api\HeyGen\VideoController;
use App\Http\Controllers\Api\HeyGen\WebhookController;
use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'auth', 'throttle:heygen-read'])->prefix('heygen')->group(function (): void {
    Route::get('/catalog', CatalogController::class);

    Route::get('/videos', [VideoController::class, 'index']);
    Route::get('/videos/{videoJob}', [VideoController::class, 'show']);
    Route::post('/videos', [VideoController::class, 'store'])->middleware('throttle:heygen-write');

    Route::post('/live/sessions', [LiveSessionController::class, 'store'])->middleware('throttle:heygen-write');
    Route::post('/live/sessions/{liveSession}/end', [LiveSessionController::class, 'end'])->middleware('throttle:heygen-write');
});

Route::post('/webhooks/heygen', WebhookController::class)->middleware('throttle:heygen-webhook');
