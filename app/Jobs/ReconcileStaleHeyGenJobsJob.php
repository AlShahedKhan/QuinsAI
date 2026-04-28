<?php

namespace App\Jobs;

use App\Domain\HeyGen\Enums\VideoJobStatus;
use App\Domain\HeyGen\HeyGenVideoAgentWorkflowService;
use App\Domain\HeyGen\HeyGenVideoWorkflowService;
use App\Models\HeyGenVideoAgentJob;
use App\Models\HeyGenVideoJob;
use App\Services\HeyGen\HeyGenClient;
use App\Services\HeyGen\HeyGenException;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class ReconcileStaleHeyGenJobsJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public int $timeout = 300;

    public function handle(
        HeyGenClient $client,
        HeyGenVideoWorkflowService $workflowService,
        HeyGenVideoAgentWorkflowService $videoAgentWorkflowService,
    ): void
    {
        $threshold = now()->subMinutes((int) config('services.heygen.reconcile_after_minutes', 3));

        HeyGenVideoJob::query()
            ->whereIn('status', [VideoJobStatus::Submitting->value, VideoJobStatus::Processing->value])
            ->whereNotNull('provider_video_id')
            ->where(function ($query) use ($threshold): void {
                $query->whereNull('submitted_at')->orWhere('submitted_at', '<=', $threshold);
            })
            ->orderBy('id')
            ->chunkById(50, function ($jobs) use ($client, $workflowService): void {
                foreach ($jobs as $job) {
                    try {
                        $statusResponse = $client->getVideoStatus((string) $job->provider_video_id);
                        $workflowService->applyProviderStatus($job, $statusResponse);
                    } catch (Throwable $throwable) {
                        if ($this->isProviderVideoNotFound($throwable)) {
                            $workflowService->markProviderVideoNotFound($job, $throwable);

                            continue;
                        }

                        Log::warning('Failed to reconcile HeyGen video job.', [
                            'video_job_id' => $job->id,
                            'provider_video_id' => $job->provider_video_id,
                            'error' => $throwable->getMessage(),
                        ]);
                    }
                }
            });

        HeyGenVideoAgentJob::query()
            ->whereIn('status', [VideoJobStatus::Submitting->value, VideoJobStatus::Processing->value])
            ->whereNotNull('provider_video_id')
            ->where(function ($query) use ($threshold): void {
                $query->whereNull('submitted_at')->orWhere('submitted_at', '<=', $threshold);
            })
            ->orderBy('id')
            ->chunkById(50, function ($jobs) use ($client, $videoAgentWorkflowService): void {
                foreach ($jobs as $job) {
                    try {
                        $statusResponse = $client->getVideoStatus((string) $job->provider_video_id);
                        $videoAgentWorkflowService->applyProviderStatus($job, $statusResponse);
                    } catch (Throwable $throwable) {
                        Log::warning('Failed to reconcile HeyGen video agent job.', [
                            'video_agent_job_id' => $job->id,
                            'provider_video_id' => $job->provider_video_id,
                            'error' => $throwable->getMessage(),
                        ]);
                    }
                }
            });
    }

    private function isProviderVideoNotFound(Throwable $throwable): bool
    {
        if ($throwable instanceof HeyGenException && $throwable->statusCode === Response::HTTP_NOT_FOUND) {
            return true;
        }

        return str_contains($throwable->getMessage(), '404')
            && str_contains($throwable->getMessage(), 'ResourceType.PACIFIC_VIDEO');
    }
}
