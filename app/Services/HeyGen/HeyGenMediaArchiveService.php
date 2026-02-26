<?php

namespace App\Services\HeyGen;

use App\Models\HeyGenVideoJob;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class HeyGenMediaArchiveService
{
    public function archive(HeyGenVideoJob $videoJob): void
    {
        $sourceUrl = $videoJob->output_provider_url;

        if ($sourceUrl === null || $sourceUrl === '') {
            return;
        }

        $response = Http::timeout((int) config('services.heygen.timeout', 20))->get($sourceUrl);
        if (! $response->successful()) {
            throw new HeyGenException('Unable to download generated video from HeyGen.', $response->status());
        }

        $diskName = (string) config('services.heygen.storage_disk', 'local');
        $prefix = trim((string) config('services.heygen.storage_prefix', 'heygen/videos'), '/');
        $extension = pathinfo(parse_url($sourceUrl, PHP_URL_PATH) ?: '', PATHINFO_EXTENSION) ?: 'mp4';

        $filename = Str::of((string) ($videoJob->provider_video_id ?: $videoJob->id))
            ->replaceMatches('/[^A-Za-z0-9\-_]/', '')
            ->append('.'.$extension)
            ->toString();

        $path = $prefix.'/'.$filename;
        $disk = Storage::disk($diskName);
        $disk->put($path, $response->body());

        $videoJob->output_storage_url = $disk->url($path);
        $videoJob->save();
    }
}
