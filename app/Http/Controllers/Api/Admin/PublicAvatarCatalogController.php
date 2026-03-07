<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\HeyGenPublicAvatar;
use App\Services\HeyGen\HeyGenPublicAvatarSyncService;
use Illuminate\Http\JsonResponse;

class PublicAvatarCatalogController extends Controller
{
    public function __construct(
        private readonly HeyGenPublicAvatarSyncService $syncService,
    ) {
    }

    public function show(): JsonResponse
    {
        return response()->json([
            'data' => $this->stats(),
        ]);
    }

    public function sync(): JsonResponse
    {
        if (function_exists('set_time_limit')) {
            @set_time_limit(240);
        }

        $summary = $this->syncService->sync();

        return response()->json([
            'message' => 'Public avatar catalog synced successfully.',
            'summary' => $summary,
            'data' => $this->stats(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function stats(): array
    {
        $total = HeyGenPublicAvatar::query()->count();
        $active = HeyGenPublicAvatar::query()->where('is_active', true)->count();
        $inactive = max(0, $total - $active);
        $previewVideoCount = HeyGenPublicAvatar::query()
            ->get(['provider_payload'])
            ->filter(static fn (HeyGenPublicAvatar $avatar): bool => is_string(data_get($avatar->provider_payload, 'preview_video_url')))
            ->count();

        $categoriesCount = HeyGenPublicAvatar::query()
            ->where('is_active', true)
            ->pluck('categories')
            ->reduce(function (array $carry, mixed $categories): array {
                if (! is_array($categories)) {
                    return $carry;
                }

                foreach ($categories as $category) {
                    if (is_string($category) && trim($category) !== '') {
                        $carry[trim($category)] = true;
                    }
                }

                return $carry;
            }, []);

        $lastSyncedAt = HeyGenPublicAvatar::query()->whereNotNull('synced_at')->max('synced_at');
        $lastAvatar = HeyGenPublicAvatar::query()->latest('synced_at')->first(['provider_avatar_id']);

        return [
            'total' => $total,
            'active' => $active,
            'inactive' => $inactive,
            'preview_video_count' => $previewVideoCount,
            'categories_count' => count($categoriesCount),
            'last_synced_at' => $lastSyncedAt,
            'latest_avatar_id' => $lastAvatar?->provider_avatar_id,
            'looks_support' => [
                'public_avatar_api_exposes_looks' => false,
                'note' => 'Public avatar details currently expose metadata and previews, but not separate look variants. Multi-look support is available through photo avatar groups.',
            ],
        ];
    }
}
