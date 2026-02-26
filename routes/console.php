<?php

use App\Jobs\ReconcileStaleHeyGenJobsJob;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('heygen:reconcile', function () {
    ReconcileStaleHeyGenJobsJob::dispatch();
    $this->info('Queued stale HeyGen job reconciliation.');
})->purpose('Queue reconciliation for non-terminal HeyGen video jobs.');

Schedule::job(new ReconcileStaleHeyGenJobsJob())->everyMinute();
