<?php

namespace App\Jobs;

use App\Domain\HeyGen\Enums\VideoJobStatus;
use App\Domain\HeyGen\HeyGenVideoAgentWorkflowService;
use App\Models\HeyGenVideoAgentJob;
use App\Services\HeyGen\HeyGenException;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SubmitHeyGenVideoAgentJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 60;

    public function __construct(
        public readonly int $videoAgentJobId,
    ) {
    }

    public function handle(HeyGenVideoAgentWorkflowService $workflowService): void
    {
        $videoAgentJob = HeyGenVideoAgentJob::query()->find($this->videoAgentJobId);
        if ($videoAgentJob === null || $videoAgentJob->status === VideoJobStatus::Completed || $videoAgentJob->status === VideoJobStatus::Failed) {
            return;
        }

        try {
            $workflowService->submitVideo($videoAgentJob);
        } catch (HeyGenException $exception) {
            $videoAgentJob->status = VideoJobStatus::Failed;
            $videoAgentJob->failed_at = now();
            $videoAgentJob->error_code = 'submit_failed';
            $videoAgentJob->error_message = $exception->getMessage();
            $videoAgentJob->save();

            throw $exception;
        }
    }
}
