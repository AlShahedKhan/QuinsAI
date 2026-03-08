<?php

namespace App\Domain\HeyGen;

use App\Domain\HeyGen\Enums\VideoJobStatus;
use App\Jobs\ArchiveHeyGenVideoAgentJob;
use App\Models\HeyGenVideoAgentJob;
use App\Services\HeyGen\HeyGenClient;
use App\Services\HeyGen\HeyGenException;
use Illuminate\Support\Arr;

class HeyGenVideoAgentWorkflowService
{
    public function __construct(
        private readonly HeyGenClient $client,
    ) {
    }

    public function submitVideo(HeyGenVideoAgentJob $videoAgentJob): void
    {
        $videoAgentJob->status = VideoJobStatus::Submitting;
        $videoAgentJob->error_code = null;
        $videoAgentJob->error_message = null;
        $videoAgentJob->save();

        $response = $this->client->generateVideoAgent([
            'prompt' => $videoAgentJob->prompt,
        ]);

        $data = (array) ($response['data'] ?? $response);

        $providerVideoId = (string) (
            $data['video_id']
            ?? $data['id']
            ?? Arr::get($data, 'video.video_id', '')
        );

        if ($providerVideoId === '') {
            throw new HeyGenException('HeyGen Video Agent response missing video ID.', 502, $response);
        }

        $videoAgentJob->provider_video_id = $providerVideoId;
        $videoAgentJob->status = VideoJobStatus::Processing;
        $videoAgentJob->provider_payload = $response;
        $videoAgentJob->submitted_at = now();
        $videoAgentJob->save();
    }

    /**
     * @param  array<string, mixed>  $providerPayload
     */
    public function applyProviderStatus(HeyGenVideoAgentJob $videoAgentJob, array $providerPayload): void
    {
        $data = (array) ($providerPayload['data'] ?? $providerPayload);

        $status = (string) (
            $data['status']
            ?? Arr::get($data, 'video.status', '')
            ?? ''
        );
        $normalized = strtolower($status);

        $videoUrl = (string) (
            $data['video_url']
            ?? $data['url']
            ?? Arr::get($data, 'video.video_url', '')
            ?? ''
        );

        if (in_array($normalized, ['completed', 'success'], true)) {
            $videoAgentJob->status = VideoJobStatus::Completed;
            $videoAgentJob->completed_at = now();
            $videoAgentJob->failed_at = null;
            if ($videoUrl !== '') {
                $videoAgentJob->output_provider_url = $videoUrl;
            }
            $videoAgentJob->provider_payload = $providerPayload;
            $videoAgentJob->error_code = null;
            $videoAgentJob->error_message = null;
            $videoAgentJob->save();

            ArchiveHeyGenVideoAgentJob::dispatch($videoAgentJob->id);

            return;
        }

        if (in_array($normalized, ['failed', 'error'], true)) {
            $videoAgentJob->status = VideoJobStatus::Failed;
            $videoAgentJob->failed_at = now();
            $videoAgentJob->provider_payload = $providerPayload;
            $videoAgentJob->error_code = (string) ($data['error_code'] ?? 'provider_failed');
            $videoAgentJob->error_message = (string) ($data['error_message'] ?? $data['message'] ?? 'HeyGen Video Agent generation failed.');
            $videoAgentJob->save();

            return;
        }

        $videoAgentJob->status = VideoJobStatus::Processing;
        $videoAgentJob->provider_payload = $providerPayload;
        $videoAgentJob->save();
    }
}
