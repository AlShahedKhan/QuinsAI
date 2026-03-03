<?php

namespace App\Services\HeyGen;

use App\Models\HeyGenDigitalTwin;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

class HeyGenDigitalTwinMediaService
{
    /**
     * @return array{training_video_path: string, consent_video_path: string}
     */
    public function storeMedia(UploadedFile $trainingFootage, UploadedFile $consentVideo, int $userId): array
    {
        $diskName = (string) config('services.heygen.digital_twin_upload_disk', 'local');
        $prefix = trim((string) config('services.heygen.digital_twin_upload_prefix', 'heygen/digital-twins'), '/');
        $basePath = $prefix.'/user-'.$userId;

        $trainingPath = $this->storeOne($trainingFootage, $diskName, $basePath, 'training');
        $consentPath = $this->storeOne($consentVideo, $diskName, $basePath, 'consent');

        return [
            'training_video_path' => $trainingPath,
            'consent_video_path' => $consentPath,
        ];
    }

    public function temporaryTrainingUrl(HeyGenDigitalTwin $digitalTwin): string
    {
        return $this->temporaryMediaUrl($digitalTwin, 'training');
    }

    public function temporaryConsentUrl(HeyGenDigitalTwin $digitalTwin): string
    {
        return $this->temporaryMediaUrl($digitalTwin, 'consent');
    }

    public function resolveMediaPath(HeyGenDigitalTwin $digitalTwin, string $kind): string
    {
        return match ($kind) {
            'training' => (string) $digitalTwin->training_video_path,
            'consent' => (string) $digitalTwin->consent_video_path,
            default => throw new HeyGenException('Invalid media kind requested.', 400),
        };
    }

    private function temporaryMediaUrl(HeyGenDigitalTwin $digitalTwin, string $kind): string
    {
        $path = $this->resolveMediaPath($digitalTwin, $kind);
        if ($path === '') {
            throw new HeyGenException('Digital twin media path is missing.', 500);
        }

        $expiresAt = now()->addMinutes((int) config('services.heygen.digital_twin_media_ttl_minutes', 1440));
        $diskName = (string) config('services.heygen.digital_twin_upload_disk', 'local');
        $disk = Storage::disk($diskName);

        try {
            /** @var string $temporaryUrl */
            $temporaryUrl = $disk->temporaryUrl($path, $expiresAt);
            return $temporaryUrl;
        } catch (\Throwable) {
            return URL::temporarySignedRoute(
                name: 'heygen.digital-twins.media',
                expiration: $expiresAt,
                parameters: [
                    'digitalTwin' => $digitalTwin->id,
                    'kind' => $kind,
                ],
            );
        }
    }

    private function storeOne(UploadedFile $file, string $diskName, string $basePath, string $kind): string
    {
        $timestamp = now()->format('YmdHis');
        $token = Str::random(22);
        $filename = "{$kind}-{$timestamp}-{$token}.mp4";
        $storedPath = "{$basePath}/{$filename}";

        Storage::disk($diskName)->putFileAs(
            path: $basePath,
            file: $file,
            name: $filename,
            options: ['visibility' => 'private'],
        );

        return $storedPath;
    }
}
