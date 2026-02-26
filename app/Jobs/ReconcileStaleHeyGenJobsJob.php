<?php

namespace App\Jobs;

use App\Domain\HeyGen\Enums\VideoJobStatus;
use App\Domain\HeyGen\HeyGenVideoWorkflowService;
use App\Models\HeyGenVideoJob;
use App\Services\HeyGen\HeyGenClient;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

class ReconcileStaleHeyGenJobsJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public int $timeout = 300;

    public function handle(HeyGenClient $client, HeyGenVideoWorkflowService $workflowService): void
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
                        Log::warning('Failed to reconcile HeyGen video job.', [
                            'video_job_id' => $job->id,
                            'provider_video_id' => $job->provider_video_id,
                            'error' => $throwable->getMessage(),
                        ]);
                    }
                }
            });
    }
}
