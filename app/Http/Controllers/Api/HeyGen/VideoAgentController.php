<?php

namespace App\Http\Controllers\Api\HeyGen;

use App\Domain\HeyGen\Enums\VideoJobStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\HeyGen\StoreVideoAgentRequest;
use App\Http\Resources\HeyGen\VideoAgentJobResource;
use App\Jobs\SubmitHeyGenVideoAgentJob;
use App\Models\HeyGenVideoAgentJob;
use App\Services\HeyGen\HeyGenClient;
use App\Services\HeyGen\HeyGenException;
use App\Services\HeyGen\HeyGenQuotaException;
use App\Services\HeyGen\HeyGenQuotaService;
use App\Services\HeyGen\HeyGenScriptSafetyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class VideoAgentController extends Controller
{
    public function __construct(
        private readonly HeyGenScriptSafetyService $scriptSafetyService,
        private readonly HeyGenQuotaService $quotaService,
        private readonly HeyGenClient $heyGenClient,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_if($user === null, Response::HTTP_UNAUTHORIZED);

        $jobs = HeyGenVideoAgentJob::query()
            ->where('user_id', $user->id)
            ->latest()
            ->paginate(20);

        return response()->json([
            'data' => $jobs->getCollection()
                ->map(static fn (HeyGenVideoAgentJob $job): array => (new VideoAgentJobResource($job))->resolve())
                ->values(),
            'current_page' => $jobs->currentPage(),
            'last_page' => $jobs->lastPage(),
            'per_page' => $jobs->perPage(),
            'total' => $jobs->total(),
        ]);
    }

    public function show(Request $request, HeyGenVideoAgentJob $videoAgentJob): VideoAgentJobResource
    {
        $user = $request->user();
        abort_if($user === null, Response::HTTP_UNAUTHORIZED);
        abort_if($videoAgentJob->user_id !== $user->id, Response::HTTP_NOT_FOUND);

        return new VideoAgentJobResource($videoAgentJob);
    }

    public function store(StoreVideoAgentRequest $request): JsonResponse
    {
        $user = $request->user();
        abort_if($user === null, Response::HTTP_UNAUTHORIZED);

        $payload = $request->validated();
        $this->scriptSafetyService->assertAllowedPrompt((string) $payload['prompt']);

        try {
            $providerQuota = $this->heyGenClient->getRemainingQuota();
        } catch (HeyGenException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
                'error' => [
                    'code' => 'provider_quota_check_failed',
                    'context' => $exception->context,
                ],
            ], Response::HTTP_BAD_GATEWAY);
        } catch (Throwable) {
            return response()->json([
                'message' => 'Could not verify HeyGen Video Agent credits. Please try again shortly.',
                'error' => [
                    'code' => 'provider_quota_check_failed',
                ],
            ], Response::HTTP_BAD_GATEWAY);
        }

        if (! $this->hasVideoAgentQuota($providerQuota)) {
            return response()->json([
                'message' => 'HeyGen API credits are finished. HeyGen requires at least 0.5 API credits for Video Agent generation.',
                'error' => [
                    'code' => 'heygen_video_agent_quota_empty',
                ],
            ], Response::HTTP_PAYMENT_REQUIRED);
        }

        try {
            $quota = $this->quotaService->consumeVideoRequest($user);
        } catch (HeyGenQuotaException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
                'error' => [
                    'code' => 'quota_exceeded',
                ],
            ], Response::HTTP_TOO_MANY_REQUESTS);
        }

        $videoAgentJob = HeyGenVideoAgentJob::query()->create([
            'user_id' => $user->id,
            'avatar_id' => filled($payload['avatar_id'] ?? null) ? (string) $payload['avatar_id'] : null,
            'voice_id' => filled($payload['voice_id'] ?? null) ? (string) $payload['voice_id'] : null,
            'prompt' => (string) $payload['prompt'],
            'status' => VideoJobStatus::Queued,
        ]);

        SubmitHeyGenVideoAgentJob::dispatch($videoAgentJob->id);

        return response()->json([
            'data' => new VideoAgentJobResource($videoAgentJob),
            'quota' => [
                'daily_request_limit' => $quota->daily_request_limit,
                'video_requests_used' => $quota->video_requests,
                'video_requests_remaining' => max(0, $quota->daily_request_limit - $quota->video_requests),
            ],
        ], Response::HTTP_ACCEPTED);
    }

    /**
     * @param  array<string, mixed>  $quotaPayload
     */
    private function hasVideoAgentQuota(array $quotaPayload): bool
    {
        $remainingQuota = data_get($quotaPayload, 'data.remaining_quota');

        return is_numeric($remainingQuota) && (float) $remainingQuota > 0;
    }
}
