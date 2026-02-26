<?php

namespace App\Http\Controllers\Api\HeyGen;

use App\Domain\HeyGen\Enums\VideoJobStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\HeyGen\StoreVideoRequest;
use App\Http\Resources\HeyGen\VideoJobResource;
use App\Jobs\SubmitHeyGenVideoJob;
use App\Models\HeyGenVideoJob;
use App\Services\HeyGen\HeyGenQuotaException;
use App\Services\HeyGen\HeyGenQuotaService;
use App\Services\HeyGen\HeyGenScriptSafetyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VideoController extends Controller
{
    public function __construct(
        private readonly HeyGenScriptSafetyService $scriptSafetyService,
        private readonly HeyGenQuotaService $quotaService,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_if($user === null, Response::HTTP_UNAUTHORIZED);

        $jobs = HeyGenVideoJob::query()
            ->where('user_id', $user->id)
            ->latest()
            ->paginate(20);

        return response()->json([
            'data' => $jobs->getCollection()
                ->map(static fn (HeyGenVideoJob $job): array => (new VideoJobResource($job))->resolve())
                ->values(),
            'current_page' => $jobs->currentPage(),
            'last_page' => $jobs->lastPage(),
            'per_page' => $jobs->perPage(),
            'total' => $jobs->total(),
        ]);
    }

    public function show(Request $request, HeyGenVideoJob $videoJob): VideoJobResource
    {
        $user = $request->user();
        abort_if($user === null, Response::HTTP_UNAUTHORIZED);
        abort_if($videoJob->user_id !== $user->id, Response::HTTP_NOT_FOUND);

        return new VideoJobResource($videoJob);
    }

    public function store(StoreVideoRequest $request): JsonResponse
    {
        $user = $request->user();
        abort_if($user === null, Response::HTTP_UNAUTHORIZED);

        $payload = $request->validated();
        $this->scriptSafetyService->assertAllowed((string) $payload['script']);

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

        $videoJob = HeyGenVideoJob::query()->create([
            'user_id' => $user->id,
            'avatar_id' => (string) $payload['avatar_id'],
            'voice_id' => (string) $payload['voice_id'],
            'script' => (string) $payload['script'],
            'status' => VideoJobStatus::Queued,
        ]);

        SubmitHeyGenVideoJob::dispatch($videoJob->id);

        return response()->json([
            'data' => new VideoJobResource($videoJob),
            'quota' => [
                'daily_request_limit' => $quota->daily_request_limit,
                'video_requests_used' => $quota->video_requests,
                'video_requests_remaining' => max(0, $quota->daily_request_limit - $quota->video_requests),
            ],
        ], Response::HTTP_ACCEPTED);
    }
}
