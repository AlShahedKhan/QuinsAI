<?php

use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Auth\PasswordController;
use App\Http\Controllers\Api\Auth\VerificationController;
use App\Http\Controllers\Api\HeyGen\CatalogController;
use App\Http\Controllers\Api\HeyGen\LiveSessionController;
use App\Http\Controllers\Api\HeyGen\VideoController;
use App\Http\Controllers\Api\HeyGen\WebhookController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function (): void {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:auth-register');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:auth-login');
    Route::post('/refresh', [AuthController::class, 'refresh'])->middleware('throttle:auth-refresh');

    Route::post('/forgot-password', [PasswordController::class, 'forgot'])->middleware('throttle:auth-password');
    Route::post('/reset-password', [PasswordController::class, 'reset'])->middleware('throttle:auth-password');
    Route::get('/reset-password/{token}', [PasswordController::class, 'redirect'])
        ->name('password.reset');

    Route::get('/email/verify/{id}/{hash}', [VerificationController::class, 'verify'])
        ->middleware(['signed', 'throttle:auth-verify'])
        ->name('verification.verify');

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::post('/logout-all', [AuthController::class, 'logoutAll']);

        Route::post('/email/verification-notification', [VerificationController::class, 'resend'])
            ->middleware('throttle:auth-verify-resend')
            ->name('verification.send');
    });
});

Route::middleware(['auth:sanctum', 'throttle:heygen-read'])->prefix('heygen')->group(function (): void {
    Route::get('/catalog', CatalogController::class);

    Route::get('/videos', [VideoController::class, 'index']);
    Route::get('/videos/{videoJob}', [VideoController::class, 'show']);
    Route::post('/videos', [VideoController::class, 'store'])->middleware('throttle:heygen-write');

    Route::post('/live/sessions', [LiveSessionController::class, 'store'])->middleware('throttle:heygen-write');
    Route::post('/live/sessions/{liveSession}/end', [LiveSessionController::class, 'end'])->middleware('throttle:heygen-write');
});

Route::post('/webhooks/heygen', WebhookController::class)->middleware('throttle:heygen-webhook');
