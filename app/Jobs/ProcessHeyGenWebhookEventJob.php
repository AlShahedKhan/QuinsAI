<?php

namespace App\Jobs;

use App\Domain\HeyGen\HeyGenDigitalTwinWorkflowService;
use App\Domain\HeyGen\HeyGenVideoWorkflowService;
use App\Models\HeyGenDigitalTwin;
use App\Models\HeyGenVideoJob;
use App\Models\HeyGenWebhookEvent;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Arr;
use Throwable;

class ProcessHeyGenWebhookEventJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 60;

    public function __construct(
        public readonly int $webhookEventId,
    ) {
    }

    public function handle(
        HeyGenVideoWorkflowService $workflowService,
        HeyGenDigitalTwinWorkflowService $digitalTwinWorkflowService,
    ): void
    {
        $event = HeyGenWebhookEvent::query()->find($this->webhookEventId);
        if ($event === null || ! $event->signature_valid) {
            return;
        }

        try {
            $payload = is_array($event->payload) ? $event->payload : [];
            $videoId = (string) (
                Arr::get($payload, 'data.video_id')
                ?? Arr::get($payload, 'video_id')
                ?? Arr::get($payload, 'data.id')
                ?? ''
            );

            if ($videoId !== '') {
                $videoJob = HeyGenVideoJob::query()
                    ->where('provider_video_id', $videoId)
                    ->first();

                if ($videoJob === null) {
                    $event->processed_at = now();
                    $event->processing_error = 'Video job not found for provider video ID.';
                    $event->save();

                    return;
                }

                $workflowService->applyProviderStatus($videoJob, $payload);
                $event->processed_at = now();
                $event->processing_error = null;
                $event->save();

                return;
            }

            $avatarId = (string) (
                Arr::get($payload, 'data.avatar_id')
                ?? Arr::get($payload, 'avatar_id')
                ?? Arr::get($payload, 'data.id')
                ?? ''
            );

            if ($avatarId === '') {
                $event->processed_at = now();
                $event->processing_error = 'Missing provider identifiers in webhook payload.';
                $event->save();

                return;
            }

            $digitalTwin = HeyGenDigitalTwin::query()
                ->where('provider_avatar_id', $avatarId)
                ->first();

            if ($digitalTwin === null) {
                $event->processed_at = now();
                $event->processing_error = 'Digital twin job not found for provider avatar ID.';
                $event->save();

                return;
            }

            $digitalTwinWorkflowService->applyProviderStatus($digitalTwin, $payload);
            $event->processed_at = now();
            $event->processing_error = null;
            $event->save();
        } catch (Throwable $throwable) {
            $event->processed_at = now();
            $event->processing_error = $throwable->getMessage();
            $event->save();

            throw $throwable;
        }
    }
}
