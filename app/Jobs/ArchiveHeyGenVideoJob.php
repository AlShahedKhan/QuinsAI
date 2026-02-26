<?php

namespace App\Jobs;

use App\Models\HeyGenVideoJob;
use App\Services\HeyGen\HeyGenMediaArchiveService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ArchiveHeyGenVideoJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 120;

    public function __construct(
        public readonly int $videoJobId,
    ) {
    }

    public function handle(HeyGenMediaArchiveService $archiveService): void
    {
        $videoJob = HeyGenVideoJob::query()->find($this->videoJobId);

        if ($videoJob === null || $videoJob->output_provider_url === null || $videoJob->output_provider_url === '') {
            return;
        }

        if ($videoJob->output_storage_url !== null && $videoJob->output_storage_url !== '') {
            return;
        }

        $archiveService->archive($videoJob);
    }
}
