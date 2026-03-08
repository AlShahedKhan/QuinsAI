<?php

use App\Jobs\ReconcileStaleHeyGenDigitalTwinsJob;
use App\Jobs\ReconcileStaleHeyGenJobsJob;
use App\Jobs\SyncHeyGenPublicAvatarsJob;
use App\Models\HeyGenPublicAvatar;
use App\Services\HeyGen\HeyGenPublicAvatarSyncService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('heygen:reconcile', function () {
    ReconcileStaleHeyGenJobsJob::dispatch();
    $this->info('Queued stale HeyGen video job reconciliation.');
})->purpose('Queue reconciliation for non-terminal HeyGen video and video agent jobs.');

Artisan::command('heygen:digital-twins:reconcile', function () {
    ReconcileStaleHeyGenDigitalTwinsJob::dispatch();
    $this->info('Queued stale HeyGen digital twin reconciliation.');
})->purpose('Queue reconciliation for non-terminal HeyGen digital twin jobs.');

Artisan::command('heygen:public-avatars:sync {--now : Run sync inline instead of queueing}', function (HeyGenPublicAvatarSyncService $syncService) {
    try {
        if ($this->option('now')) {
            $summary = $syncService->sync();
            $this->info("Synced {$summary['synced']} public avatars. Deactivated {$summary['deactivated']}.");

            return 0;
        }

        SyncHeyGenPublicAvatarsJob::dispatch();
        $this->info('Queued HeyGen public avatar sync.');

        return 0;
    } catch (\Throwable $throwable) {
        report($throwable);

        $activeAvatarCount = HeyGenPublicAvatar::query()->where('is_active', true)->count();

        if ($activeAvatarCount > 0) {
            $this->warn("Public avatar sync failed, keeping {$activeAvatarCount} locally cached avatars.");
            $this->line('Increase HEYGEN_PUBLIC_AVATAR_SYNC_TIMEOUT in .env if your network is slow.');

            return 0;
        }

        $this->error('Public avatar sync failed: '.$throwable->getMessage());
        $this->line('Increase HEYGEN_PUBLIC_AVATAR_SYNC_TIMEOUT in .env if your network is slow.');

        return 1;
    }
})->purpose('Sync HeyGen public avatars into the local database.');

Schedule::job(new ReconcileStaleHeyGenJobsJob())->everyMinute();
Schedule::job(new ReconcileStaleHeyGenDigitalTwinsJob())->everyMinute();
Schedule::command('heygen:public-avatars:sync --now')->everySixHours()->withoutOverlapping();
