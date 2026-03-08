<?php

namespace App\Http\Controllers\Api\HeyGen;

use App\Domain\HeyGen\Enums\VideoJobStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\HeyGen\StoreVideoAgentRequest;
use App\Http\Resources\HeyGen\VideoAgentJobResource;
use App\Jobs\SubmitHeyGenVideoAgentJob;
use App\Models\HeyGenVideoAgentJob;
use App\Services\HeyGen\HeyGenQuotaException;
use App\Services\HeyGen\HeyGenQuotaService;
use App\Services\HeyGen\HeyGenScriptSafetyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VideoAgentController extends Controller
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
}
