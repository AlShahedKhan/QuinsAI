<?php

namespace App\Jobs;

use App\Models\HeyGenVideoAgentJob;
use App\Services\HeyGen\HeyGenMediaArchiveService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ArchiveHeyGenVideoAgentJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 120;

    public function __construct(
        public readonly int $videoAgentJobId,
    ) {
    }

    public function handle(HeyGenMediaArchiveService $archiveService): void
    {
        $videoAgentJob = HeyGenVideoAgentJob::query()->find($this->videoAgentJobId);

        if ($videoAgentJob === null || $videoAgentJob->output_provider_url === null || $videoAgentJob->output_provider_url === '') {
            return;
        }

        if ($videoAgentJob->output_storage_url !== null && $videoAgentJob->output_storage_url !== '') {
            return;
        }

        $archiveService->archive($videoAgentJob);
    }
}
