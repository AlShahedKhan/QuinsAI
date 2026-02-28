<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('heygen-read', function (Request $request): Limit {
            return Limit::perMinute(120)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('heygen-write', function (Request $request): Limit {
            return Limit::perMinute(20)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('heygen-webhook', function (Request $request): Limit {
            return Limit::perMinute(240)->by($request->ip());
        });

        RateLimiter::for('auth-register', function (Request $request): Limit {
            return Limit::perMinute(5)->by($request->ip());
        });

        RateLimiter::for('auth-login', function (Request $request): Limit {
            return Limit::perMinute(10)->by($request->ip());
        });

        RateLimiter::for('auth-admin-login', function (Request $request): Limit {
            $email = mb_strtolower((string) $request->input('email', 'unknown'));

            return Limit::perMinute(5)->by($email.'|'.$request->ip());
        });

        RateLimiter::for('admin-security', function (Request $request): Limit {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('auth-refresh', function (Request $request): Limit {
            return Limit::perMinute(30)->by($request->ip());
        });

        RateLimiter::for('auth-password', function (Request $request): Limit {
            return Limit::perMinute(6)->by($request->ip());
        });

        RateLimiter::for('auth-verify', function (Request $request): Limit {
            return Limit::perMinute(6)->by($request->ip());
        });

        RateLimiter::for('auth-verify-resend', function (Request $request): Limit {
            return Limit::perMinute(3)->by($request->user()?->id ?: $request->ip());
        });
    }
}
