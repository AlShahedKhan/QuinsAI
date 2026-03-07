<?php

namespace App\Jobs;

use App\Services\HeyGen\HeyGenPublicAvatarSyncService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SyncHeyGenPublicAvatarsJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 180;

    public int $tries = 1;

    public function handle(HeyGenPublicAvatarSyncService $syncService): void
    {
        $syncService->sync();
    }
}
