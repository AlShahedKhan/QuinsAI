<?php

namespace App\Jobs;

use App\Domain\HeyGen\Enums\DigitalTwinStatus;
use App\Domain\HeyGen\HeyGenDigitalTwinWorkflowService;
use App\Models\HeyGenDigitalTwin;
use App\Services\HeyGen\HeyGenClient;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

class ReconcileStaleHeyGenDigitalTwinsJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public int $timeout = 300;

    public function handle(HeyGenClient $client, HeyGenDigitalTwinWorkflowService $workflowService): void
    {
        $threshold = now()->subMinutes((int) config('services.heygen.digital_twin_reconcile_after_minutes', 5));

        HeyGenDigitalTwin::query()
            ->whereIn('status', [DigitalTwinStatus::Submitting->value, DigitalTwinStatus::Processing->value])
            ->whereNotNull('provider_avatar_id')
            ->where(function ($query) use ($threshold): void {
                $query->whereNull('submitted_at')->orWhere('submitted_at', '<=', $threshold);
            })
            ->orderBy('id')
            ->chunkById(25, function ($digitalTwins) use ($client, $workflowService): void {
                foreach ($digitalTwins as $digitalTwin) {
                    try {
                        $statusResponse = $client->getDigitalTwinStatus((string) $digitalTwin->provider_avatar_id);
                        $workflowService->applyProviderStatus($digitalTwin, $statusResponse);
                    } catch (Throwable $throwable) {
                        Log::warning('Failed to reconcile HeyGen digital twin job.', [
                            'digital_twin_id' => $digitalTwin->id,
                            'provider_avatar_id' => $digitalTwin->provider_avatar_id,
                            'error' => $throwable->getMessage(),
                        ]);
                    }
                }
            });
    }
}

