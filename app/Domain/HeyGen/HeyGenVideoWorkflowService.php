<?php

namespace App\Domain\HeyGen;

use App\Domain\HeyGen\Enums\VideoJobStatus;
use App\Jobs\ArchiveHeyGenVideoJob;
use App\Models\HeyGenVideoJob;
use App\Services\HeyGen\HeyGenClient;
use App\Services\HeyGen\HeyGenException;
use Illuminate\Support\Arr;

class HeyGenVideoWorkflowService
{
    public function __construct(
        private readonly HeyGenClient $client,
    ) {
    }

    public function submitVideo(HeyGenVideoJob $videoJob): void
    {
        $videoJob->status = VideoJobStatus::Submitting;
        $videoJob->error_code = null;
        $videoJob->error_message = null;
        $videoJob->save();

        $payload = [
            'video_inputs' => [[
                'character' => [
                    'type' => 'avatar',
                    'avatar_id' => $videoJob->avatar_id,
                    'avatar_style' => 'normal',
                ],
                'voice' => [
                    'type' => 'text',
                    'voice_id' => $videoJob->voice_id,
                    'input_text' => $videoJob->script,
                ],
            ]],
        ];

        $response = $this->client->generateVideo($payload);
        $data = (array) ($response['data'] ?? $response);

        $providerVideoId = (string) (
            $data['video_id']
            ?? $data['id']
            ?? Arr::get($data, 'video.video_id', '')
        );

        if ($providerVideoId === '') {
            throw new HeyGenException('HeyGen response missing video ID.', 502, $response);
        }

        $videoJob->provider_video_id = $providerVideoId;
        $videoJob->status = VideoJobStatus::Processing;
        $videoJob->provider_payload = $response;
        $videoJob->submitted_at = now();
        $videoJob->save();
    }

    /**
     * @param  array<string, mixed>  $providerPayload
     */
    public function applyProviderStatus(HeyGenVideoJob $videoJob, array $providerPayload): void
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

        if ($normalized === 'completed' || $normalized === 'success') {
            $videoJob->status = VideoJobStatus::Completed;
            $videoJob->completed_at = now();
            $videoJob->failed_at = null;
            if ($videoUrl !== '') {
                $videoJob->output_provider_url = $videoUrl;
            }
            $videoJob->provider_payload = $providerPayload;
            $videoJob->error_code = null;
            $videoJob->error_message = null;
            $videoJob->save();

            ArchiveHeyGenVideoJob::dispatch($videoJob->id);

            return;
        }

        if (in_array($normalized, ['failed', 'error'], true)) {
            $videoJob->status = VideoJobStatus::Failed;
            $videoJob->failed_at = now();
            $videoJob->provider_payload = $providerPayload;
            $videoJob->error_code = (string) ($data['error_code'] ?? 'provider_failed');
            $videoJob->error_message = (string) ($data['error_message'] ?? $data['message'] ?? 'HeyGen generation failed.');
            $videoJob->save();

            return;
        }

        $videoJob->status = VideoJobStatus::Processing;
        $videoJob->provider_payload = $providerPayload;
        $videoJob->save();
    }
}
