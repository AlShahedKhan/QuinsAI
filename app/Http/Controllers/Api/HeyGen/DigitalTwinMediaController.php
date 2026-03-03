<?php

namespace App\Http\Controllers\Api\HeyGen;

use App\Http\Controllers\Controller;
use App\Models\HeyGenDigitalTwin;
use App\Services\HeyGen\HeyGenDigitalTwinMediaService;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DigitalTwinMediaController extends Controller
{
    public function __construct(
        private readonly HeyGenDigitalTwinMediaService $mediaService,
    ) {
    }

    public function __invoke(HeyGenDigitalTwin $digitalTwin, string $kind): Response|BinaryFileResponse|StreamedResponse
    {
        $path = $this->mediaService->resolveMediaPath($digitalTwin, $kind);
        $diskName = (string) config('services.heygen.digital_twin_upload_disk', 'local');
        $disk = Storage::disk($diskName);

        abort_unless($disk->exists($path), 404);

        return $disk->response($path, null, [
            'Content-Type' => 'video/mp4',
            'Cache-Control' => 'private, max-age=0, no-store',
            'X-Robots-Tag' => 'noindex, nofollow',
        ]);
    }
}

