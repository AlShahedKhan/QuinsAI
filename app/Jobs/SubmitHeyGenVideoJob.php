<?php

namespace App\Jobs;

use App\Domain\HeyGen\Enums\VideoJobStatus;
use App\Domain\HeyGen\HeyGenVideoWorkflowService;
use App\Models\HeyGenVideoJob;
use App\Services\HeyGen\HeyGenException;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SubmitHeyGenVideoJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 60;

    public function __construct(
        public readonly int $videoJobId,
    ) {
    }

    public function handle(HeyGenVideoWorkflowService $workflowService): void
    {
        $videoJob = HeyGenVideoJob::query()->find($this->videoJobId);
        if ($videoJob === null || $videoJob->status === VideoJobStatus::Completed || $videoJob->status === VideoJobStatus::Failed) {
            return;
        }

        try {
            $workflowService->submitVideo($videoJob);
        } catch (HeyGenException $exception) {
            $videoJob->status = VideoJobStatus::Failed;
            $videoJob->failed_at = now();
            $videoJob->error_code = 'submit_failed';
            $videoJob->error_message = $exception->getMessage();
            $videoJob->save();

            throw $exception;
        }
    }
}
