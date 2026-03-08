<?php

namespace App\Jobs;

use App\Domain\HeyGen\HeyGenDigitalTwinWorkflowService;
use App\Domain\HeyGen\HeyGenVideoAgentWorkflowService;
use App\Domain\HeyGen\HeyGenVideoWorkflowService;
use App\Models\HeyGenDigitalTwin;
use App\Models\HeyGenVideoAgentJob;
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
        HeyGenVideoAgentWorkflowService $videoAgentWorkflowService,
    ): void
    {
        $event = HeyGenWebhookEvent::query()->find($this->webhookEventId);
        if ($event === null || ! $event->signature_valid) {
            return;
        }

        try {
            $payload = is_array($event->payload) ? $event->payload : [];
            $normalizedPayload = $this->normalizeVideoPayload($payload);
            $videoId = (string) (
                Arr::get($normalizedPayload, 'data.video_id')
                ?? Arr::get($normalizedPayload, 'video_id')
                ?? Arr::get($normalizedPayload, 'data.id')
                ?? ''
            );

            if ($videoId !== '') {
                $videoJob = HeyGenVideoJob::query()
                    ->where('provider_video_id', $videoId)
                    ->first();

                if ($videoJob !== null) {
                    $workflowService->applyProviderStatus($videoJob, $normalizedPayload);
                    $event->processed_at = now();
                    $event->processing_error = null;
                    $event->save();

                    return;
                }

                $videoAgentJob = HeyGenVideoAgentJob::query()
                    ->where('provider_video_id', $videoId)
                    ->first();

                if ($videoAgentJob !== null) {
                    $videoAgentWorkflowService->applyProviderStatus($videoAgentJob, $normalizedPayload);
                    $event->processed_at = now();
                    $event->processing_error = null;
                    $event->save();

                    return;
                }

                $event->processed_at = now();
                $event->processing_error = 'Video or video agent job not found for provider video ID.';
                $event->save();

                return;
            }

            $avatarId = (string) (
                Arr::get($payload, 'data.avatar_id')
                ?? Arr::get($payload, 'event_data.avatar_id')
                ?? Arr::get($payload, 'avatar_id')
                ?? Arr::get($payload, 'data.id')
                ?? Arr::get($payload, 'event_data.id')
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

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function normalizeVideoPayload(array $payload): array
    {
        $eventType = strtolower((string) (Arr::get($payload, 'event_type') ?? Arr::get($payload, 'type') ?? ''));
        $eventData = Arr::get($payload, 'event_data');

        if (! is_array($eventData)) {
            return $payload;
        }

        if (in_array($eventType, ['avatar_video.success', 'video_agent.success'], true)) {
            return [
                'event_type' => $eventType,
                'data' => [
                    'status' => 'completed',
                    'video_id' => (string) (Arr::get($eventData, 'video_id') ?? Arr::get($eventData, 'id') ?? ''),
                    'video_url' => Arr::get($eventData, 'url') ?? Arr::get($eventData, 'video_url'),
                    'thumbnail_url' => Arr::get($eventData, 'thumbnail_url'),
                    'callback_id' => Arr::get($eventData, 'callback_id'),
                ],
            ];
        }

        if (in_array($eventType, ['avatar_video.fail', 'video_agent.fail'], true)) {
            return [
                'event_type' => $eventType,
                'data' => [
                    'status' => 'failed',
                    'video_id' => (string) (Arr::get($eventData, 'video_id') ?? Arr::get($eventData, 'id') ?? ''),
                    'error_code' => (string) (Arr::get($eventData, 'error_code') ?? 'provider_failed'),
                    'error_message' => (string) (Arr::get($eventData, 'message') ?? Arr::get($eventData, 'msg') ?? 'HeyGen generation failed.'),
                    'callback_id' => Arr::get($eventData, 'callback_id'),
                ],
            ];
        }

        return $payload;
    }
}
