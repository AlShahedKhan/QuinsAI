<?php

namespace App\Http\Controllers\Api\HeyGen;

use App\Http\Controllers\Controller;
use App\Services\HeyGen\HeyGenClient;
use App\Services\HeyGen\HeyGenException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class QuotaController extends Controller
{
    public function __construct(
        private readonly HeyGenClient $client,
    ) {
    }

    public function __invoke(Request $request): JsonResponse
    {
        abort_if($request->user() === null, Response::HTTP_UNAUTHORIZED);

        try {
            $quota = $this->client->getRemainingQuota();
        } catch (HeyGenException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
                'error' => [
                    'code' => 'heygen_quota_lookup_failed',
                    'context' => $exception->context,
                ],
            ], Response::HTTP_BAD_GATEWAY);
        } catch (Throwable) {
            return response()->json([
                'message' => 'Could not check HeyGen credits. Please try again shortly.',
                'error' => [
                    'code' => 'heygen_quota_lookup_failed',
                ],
            ], Response::HTTP_BAD_GATEWAY);
        }

        $remainingQuota = data_get($quota, 'data.remaining_quota');
        $details = data_get($quota, 'data.details', []);

        return response()->json([
            'data' => [
                'remaining_quota' => is_numeric($remainingQuota) ? (float) $remainingQuota : 0.0,
                'is_empty' => ! is_numeric($remainingQuota) || (float) $remainingQuota <= 0,
                'details' => is_array($details) ? $details : [],
                'checked_at' => now()->toIso8601String(),
            ],
        ]);
    }
}
