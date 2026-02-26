<?php

namespace App\Services\HeyGen;

use Illuminate\Http\Request;
use Illuminate\Support\Str;

class HeyGenWebhookSignatureService
{
    private const TIMESTAMP_TOLERANCE_SECONDS = 300;

    public function isValid(Request $request): bool
    {
        $secret = (string) config('services.heygen.webhook_secret');
        if ($secret === '') {
            return false;
        }

        $signature = $this->extractHeader($request, [
            'X-HeyGen-Signature',
            'X-Heygen-Signature',
            'X-Signature',
        ]);

        if ($signature === null || $signature === '') {
            return false;
        }

        $timestampHeader = $this->extractHeader($request, [
            'X-HeyGen-Timestamp',
            'X-Heygen-Timestamp',
            'X-Timestamp',
        ]);

        $payload = $request->getContent();

        if ($timestampHeader !== null && $timestampHeader !== '') {
            if (! ctype_digit($timestampHeader)) {
                return false;
            }

            $timestamp = (int) $timestampHeader;
            if (abs(time() - $timestamp) > self::TIMESTAMP_TOLERANCE_SECONDS) {
                return false;
            }

            $signedPayload = $timestampHeader.'.'.$payload;
            return $this->matchesSignature($signedPayload, $signature, $secret);
        }

        return $this->matchesSignature($payload, $signature, $secret);
    }

    private function extractHeader(Request $request, array $candidateHeaders): ?string
    {
        foreach ($candidateHeaders as $name) {
            $value = $request->header($name);
            if (is_string($value) && $value !== '') {
                return $value;
            }
        }

        return null;
    }

    private function matchesSignature(string $payload, string $provided, string $secret): bool
    {
        $hex = hash_hmac('sha256', $payload, $secret);
        $base64 = base64_encode(hex2bin($hex) ?: '');

        $normalizedProvided = trim($provided);

        if (Str::contains($normalizedProvided, '=')) {
            $parts = explode('=', $normalizedProvided, 2);
            $normalizedProvided = $parts[1] ?? $normalizedProvided;
        }

        return hash_equals($hex, $normalizedProvided) || hash_equals($base64, $normalizedProvided);
    }
}
