<?php

namespace App\Jobs;

use App\Domain\HeyGen\Enums\DigitalTwinStatus;
use App\Domain\HeyGen\HeyGenDigitalTwinWorkflowService;
use App\Models\HeyGenDigitalTwin;
use App\Services\HeyGen\HeyGenException;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SubmitHeyGenDigitalTwinJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 120;

    public function __construct(
        public readonly int $digitalTwinId,
    ) {
    }

    public function handle(HeyGenDigitalTwinWorkflowService $workflowService): void
    {
        $digitalTwin = HeyGenDigitalTwin::query()->find($this->digitalTwinId);
        if ($digitalTwin === null || $digitalTwin->status->isTerminal()) {
            return;
        }

        try {
            $workflowService->submitDigitalTwin($digitalTwin);
        } catch (HeyGenException $exception) {
            $digitalTwin->status = DigitalTwinStatus::Failed;
            $digitalTwin->failed_at = now();
            $digitalTwin->error_code = 'submit_failed';
            $digitalTwin->error_message = $exception->getMessage();
            $digitalTwin->save();

            throw $exception;
        }
    }
}

