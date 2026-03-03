<?php

namespace App\Domain\HeyGen;

use App\Domain\HeyGen\Enums\DigitalTwinStatus;
use App\Models\HeyGenDigitalTwin;
use App\Services\HeyGen\HeyGenClient;
use App\Services\HeyGen\HeyGenDigitalTwinMediaService;
use App\Services\HeyGen\HeyGenException;
use Illuminate\Support\Arr;

class HeyGenDigitalTwinWorkflowService
{
    public function __construct(
        private readonly HeyGenClient $client,
        private readonly HeyGenDigitalTwinMediaService $mediaService,
    ) {
    }

    public function submitDigitalTwin(HeyGenDigitalTwin $digitalTwin): void
    {
        $digitalTwin->status = DigitalTwinStatus::Submitting;
        $digitalTwin->error_code = null;
        $digitalTwin->error_message = null;
        $digitalTwin->save();

        $trainingUrl = $this->mediaService->temporaryTrainingUrl($digitalTwin);
        $consentUrl = $this->mediaService->temporaryConsentUrl($digitalTwin);

        $payload = [
            'training_footage_url' => $trainingUrl,
            'video_consent_url' => $consentUrl,
            'avatar_name' => $digitalTwin->avatar_name,
            'callback_id' => 'digital_twin_request_'.$digitalTwin->id,
        ];

        $response = $this->client->createDigitalTwin($payload);
        $data = (array) ($response['data'] ?? $response);

        $providerAvatarId = (string) ($data['avatar_id'] ?? $data['id'] ?? '');
        if ($providerAvatarId === '') {
            throw new HeyGenException('HeyGen response missing avatar ID for digital twin request.', 502, $response);
        }

        $digitalTwin->provider_avatar_id = $providerAvatarId;
        $providerAvatarGroupId = (string) ($data['avatar_group_id'] ?? '');
        $digitalTwin->provider_avatar_group_id = $providerAvatarGroupId !== '' ? $providerAvatarGroupId : null;
        $digitalTwin->status = DigitalTwinStatus::Processing;
        $digitalTwin->training_video_url = $trainingUrl;
        $digitalTwin->consent_video_url = $consentUrl;
        $digitalTwin->provider_payload = $response;
        $digitalTwin->submitted_at = now();
        $digitalTwin->save();
    }

    /**
     * @param  array<string, mixed>  $providerPayload
     */
    public function applyProviderStatus(HeyGenDigitalTwin $digitalTwin, array $providerPayload): void
    {
        $data = (array) ($providerPayload['data'] ?? $providerPayload);
        $rawStatus = (string) (
            $data['status']
            ?? Arr::get($data, 'avatar.status', '')
            ?? ''
        );
        $status = strtolower($rawStatus);
        $previewImageUrl = (string) (
            $data['preview_image_url']
            ?? Arr::get($data, 'avatar.preview_image_url', '')
            ?? ''
        );
        $previewVideoUrl = (string) (
            $data['preview_video_url']
            ?? Arr::get($data, 'avatar.preview_video_url', '')
            ?? ''
        );

        if (str_contains($status, 'completed') || str_contains($status, 'success')) {
            $digitalTwin->status = DigitalTwinStatus::Completed;
            $digitalTwin->completed_at = now();
            $digitalTwin->failed_at = null;
            $digitalTwin->error_code = null;
            $digitalTwin->error_message = null;
            if ($previewImageUrl !== '') {
                $digitalTwin->preview_image_url = $previewImageUrl;
            }
            if ($previewVideoUrl !== '') {
                $digitalTwin->preview_video_url = $previewVideoUrl;
            }
            $digitalTwin->provider_payload = $providerPayload;
            $digitalTwin->save();

            return;
        }

        if (str_contains($status, 'failed') || str_contains($status, 'error')) {
            $digitalTwin->status = DigitalTwinStatus::Failed;
            $digitalTwin->failed_at = now();
            $digitalTwin->provider_payload = $providerPayload;
            $digitalTwin->error_code = (string) ($data['error_code'] ?? 'digital_twin_failed');
            $digitalTwin->error_message = (string) ($data['error_message'] ?? $data['message'] ?? 'HeyGen digital twin creation failed.');
            $digitalTwin->save();

            return;
        }

        $digitalTwin->status = DigitalTwinStatus::Processing;
        $digitalTwin->provider_payload = $providerPayload;
        $digitalTwin->save();
    }
}
