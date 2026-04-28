<?php

namespace App\Http\Controllers\Api\HeyGen;

use App\Domain\HeyGen\Enums\VideoJobStatus;
use App\Domain\HeyGen\HeyGenVideoWorkflowService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\HeyGen\StoreVideoRequest;
use App\Http\Resources\HeyGen\VideoJobResource;
use App\Jobs\SubmitHeyGenVideoJob;
use App\Models\HeyGenVideoJob;
use App\Services\HeyGen\HeyGenClient;
use App\Services\HeyGen\HeyGenException;
use App\Services\HeyGen\HeyGenQuotaException;
use App\Services\HeyGen\HeyGenQuotaService;
use App\Services\HeyGen\HeyGenScriptSafetyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class VideoController extends Controller
{
    public function __construct(
        private readonly HeyGenScriptSafetyService $scriptSafetyService,
        private readonly HeyGenQuotaService $quotaService,
        private readonly HeyGenClient $heyGenClient,
        private readonly HeyGenVideoWorkflowService $videoWorkflowService,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_if($user === null, Response::HTTP_UNAUTHORIZED);
        $this->reconcileStaleUserJobs((int) $user->id);

        $validated = $request->validate([
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
            'status' => ['nullable', 'string', Rule::in(array_map(
                static fn (VideoJobStatus $status): string => $status->value,
                VideoJobStatus::cases(),
            ))],
        ]);

        $baseQuery = HeyGenVideoJob::query()
            ->where('user_id', $user->id);

        $stats = [
            'total' => (clone $baseQuery)->count(),
            'active' => (clone $baseQuery)->whereIn('status', [
                VideoJobStatus::Queued->value,
                VideoJobStatus::Submitting->value,
                VideoJobStatus::Processing->value,
            ])->count(),
            'completed' => (clone $baseQuery)->where('status', VideoJobStatus::Completed->value)->count(),
            'failed' => (clone $baseQuery)->where('status', VideoJobStatus::Failed->value)->count(),
        ];

        $jobsQuery = (clone $baseQuery)->latest();

        if (isset($validated['status'])) {
            $jobsQuery->where('status', $validated['status']);
        }

        $jobs = $jobsQuery->paginate((int) ($validated['per_page'] ?? 12));

        return response()->json([
            'data' => $jobs->getCollection()
                ->map(static fn (HeyGenVideoJob $job): array => (new VideoJobResource($job))->resolve())
                ->values(),
            'current_page' => $jobs->currentPage(),
            'last_page' => $jobs->lastPage(),
            'per_page' => $jobs->perPage(),
            'total' => $jobs->total(),
            'meta' => [
                'stats' => $stats,
                'timing' => $this->timingMeta((int) $user->id),
            ],
        ]);
    }

    public function show(Request $request, HeyGenVideoJob $videoJob): VideoJobResource
    {
        $user = $request->user();
        abort_if($user === null, Response::HTTP_UNAUTHORIZED);
        abort_if($videoJob->user_id !== $user->id, Response::HTTP_NOT_FOUND);
        $this->reconcileSingleJob($videoJob);
        $videoJob->refresh();

        return new VideoJobResource($videoJob);
    }

    public function store(StoreVideoRequest $request): JsonResponse
    {
        $user = $request->user();
        abort_if($user === null, Response::HTTP_UNAUTHORIZED);

        $payload = $request->validated();
        $this->scriptSafetyService->assertAllowed((string) $payload['script']);

        try {
            $remainingQuota = $this->heyGenClient->getRemainingQuota();
        } catch (Throwable $throwable) {
            return response()->json([
                'message' => 'Could not verify HeyGen API credits. Please try again shortly.',
                'error' => [
                    'code' => 'provider_quota_check_failed',
                ],
            ], Response::HTTP_BAD_GATEWAY);
        }

        if (! $this->hasVideoQuota($remainingQuota)) {
            return response()->json([
                'message' => 'HeyGen API credits are finished. Please add HeyGen API credits, then try generating the video again.',
                'error' => [
                    'code' => 'heygen_quota_empty',
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

    private function reconcileStaleUserJobs(int $userId): void
    {
        $threshold = now()->subMinutes((int) config('services.heygen.reconcile_after_minutes', 3));

        $jobs = HeyGenVideoJob::query()
            ->where('user_id', $userId)
            ->whereIn('status', [VideoJobStatus::Submitting->value, VideoJobStatus::Processing->value])
            ->whereNotNull('provider_video_id')
            ->where(function ($query) use ($threshold): void {
                $query->whereNull('submitted_at')->orWhere('submitted_at', '<=', $threshold);
            })
            ->latest('id')
            ->limit(8)
            ->get();

        foreach ($jobs as $job) {
            $this->reconcileSingleJob($job);
        }
    }

    private function reconcileSingleJob(HeyGenVideoJob $job): void
    {
        $providerVideoId = (string) $job->provider_video_id;
        if ($providerVideoId === '') {
            return;
        }

        try {
            $statusResponse = $this->heyGenClient->getVideoStatus($providerVideoId);
            $this->videoWorkflowService->applyProviderStatus($job, $statusResponse);
        } catch (Throwable $throwable) {
            if ($this->isProviderVideoNotFound($throwable)) {
                $this->videoWorkflowService->markProviderVideoNotFound($job, $throwable);

                return;
            }

            Log::warning('Inline reconcile failed for HeyGen video job.', [
                'video_job_id' => $job->id,
                'provider_video_id' => $providerVideoId,
                'error' => $throwable->getMessage(),
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $quotaPayload
     */
    private function hasVideoQuota(array $quotaPayload): bool
    {
        $remainingQuota = data_get($quotaPayload, 'data.remaining_quota');

        return is_numeric($remainingQuota) && (float) $remainingQuota > 0;
    }

    private function isProviderVideoNotFound(Throwable $throwable): bool
    {
        if ($throwable instanceof HeyGenException && $throwable->statusCode === Response::HTTP_NOT_FOUND) {
            return true;
        }

        return str_contains($throwable->getMessage(), '404')
            && str_contains($throwable->getMessage(), 'ResourceType.PACIFIC_VIDEO');
    }

    /**
     * @return array{average_completion_seconds: ?int, active_oldest_submitted_at: ?string}
     */
    private function timingMeta(int $userId): array
    {
        $completed = HeyGenVideoJob::query()
            ->where('user_id', $userId)
            ->where('status', VideoJobStatus::Completed->value)
            ->whereNotNull('submitted_at')
            ->whereNotNull('completed_at')
            ->latest('completed_at')
            ->limit(20)
            ->get(['submitted_at', 'completed_at']);

        $durations = [];
        foreach ($completed as $job) {
            if ($job->submitted_at !== null && $job->completed_at !== null) {
                $durations[] = max(0, $job->submitted_at->diffInSeconds($job->completed_at));
            }
        }

        $average = count($durations) > 0 ? (int) round(array_sum($durations) / count($durations)) : null;

        $oldestActive = HeyGenVideoJob::query()
            ->where('user_id', $userId)
            ->whereIn('status', [
                VideoJobStatus::Queued->value,
                VideoJobStatus::Submitting->value,
                VideoJobStatus::Processing->value,
            ])
            ->whereNotNull('submitted_at')
            ->oldest('submitted_at')
            ->first(['submitted_at']);

        return [
            'average_completion_seconds' => $average,
            'active_oldest_submitted_at' => $oldestActive?->submitted_at?->toIso8601String(),
        ];
    }
}
