<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'heygen' => [
        'base_url' => env('HEYGEN_BASE_URL', 'https://api.heygen.com'),
        'api_key' => env('HEYGEN_API_KEY'),
        'webhook_secret' => env('HEYGEN_WEBHOOK_SECRET'),
        'timeout' => (int) env('HEYGEN_TIMEOUT', 20),
        'retry_times' => (int) env('HEYGEN_RETRY_TIMES', 2),
        'retry_sleep_ms' => (int) env('HEYGEN_RETRY_SLEEP_MS', 250),
        'script_max_chars' => (int) env('HEYGEN_SCRIPT_MAX_CHARS', 1500),
        'script_blocklist' => array_values(array_filter(array_map(
            static fn (string $term): string => trim($term),
            explode(',', (string) env('HEYGEN_SCRIPT_BLOCKLIST', ''))
        ))),
        'daily_request_limit' => (int) env('HEYGEN_DAILY_REQUEST_LIMIT', 5),
        'daily_live_minute_limit' => (int) env('HEYGEN_DAILY_LIVE_MINUTE_LIMIT', 30),
        'storage_disk' => env('HEYGEN_STORAGE_DISK', env('FILESYSTEM_DISK', 'local')),
        'storage_prefix' => env('HEYGEN_STORAGE_PREFIX', 'heygen/videos'),
        'reconcile_after_minutes' => (int) env('HEYGEN_RECONCILE_AFTER_MINUTES', 3),
    ],

];
