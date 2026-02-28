<?php

use App\Http\Controllers\Api\Admin\PermissionController as AdminPermissionController;
use App\Http\Controllers\Api\Admin\RoleController as AdminRoleController;
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
    Route::post('/admin/login', [AuthController::class, 'adminLogin'])->middleware('throttle:auth-admin-login');
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

Route::middleware(['auth:sanctum', 'throttle:admin-security'])->prefix('admin')->group(function (): void {
    Route::get('/roles', [AdminRoleController::class, 'index'])->middleware('permission:roles.view');
    Route::post('/roles', [AdminRoleController::class, 'store'])->middleware('permission:roles.create');
    Route::get('/roles/{role}', [AdminRoleController::class, 'show'])->middleware('permission:roles.view');
    Route::put('/roles/{role}', [AdminRoleController::class, 'update'])->middleware('permission:roles.update');
    Route::patch('/roles/{role}', [AdminRoleController::class, 'update'])->middleware('permission:roles.update');
    Route::delete('/roles/{role}', [AdminRoleController::class, 'destroy'])->middleware('permission:roles.delete');

    Route::get('/permissions', [AdminPermissionController::class, 'index'])->middleware('permission:permissions.view');
    Route::post('/permissions', [AdminPermissionController::class, 'store'])->middleware('permission:permissions.create');
    Route::get('/permissions/{permission}', [AdminPermissionController::class, 'show'])->middleware('permission:permissions.view');
    Route::put('/permissions/{permission}', [AdminPermissionController::class, 'update'])->middleware('permission:permissions.update');
    Route::patch('/permissions/{permission}', [AdminPermissionController::class, 'update'])->middleware('permission:permissions.update');
    Route::delete('/permissions/{permission}', [AdminPermissionController::class, 'destroy'])->middleware('permission:permissions.delete');
});

Route::post('/webhooks/heygen', WebhookController::class)->middleware('throttle:heygen-webhook');
