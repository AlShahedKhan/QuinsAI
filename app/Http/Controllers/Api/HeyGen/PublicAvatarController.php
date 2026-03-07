<?php

namespace App\Http\Controllers\Api\HeyGen;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\HeyGen\ListPublicAvatarsRequest;
use App\Http\Resources\HeyGen\PublicAvatarResource;
use App\Models\HeyGenPublicAvatar;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class PublicAvatarController extends Controller
{
    public function __invoke(ListPublicAvatarsRequest $request): JsonResponse
    {
        $payload = $request->validated();
        $perPage = min(100, max(1, (int) ($payload['per_page'] ?? 50)));
        $search = trim((string) ($payload['search'] ?? ''));
        $category = trim((string) ($payload['category'] ?? ''));

        $query = HeyGenPublicAvatar::query()
            ->where('is_active', true)
            ->orderBy('name');

        if ($search !== '') {
            $normalizedSearch = mb_strtolower($search);

            $query->where(function ($builder) use ($normalizedSearch): void {
                $builder
                    ->whereRaw('LOWER(name) LIKE ?', ["%{$normalizedSearch}%"])
                    ->orWhereRaw('LOWER(provider_avatar_id) LIKE ?', ["%{$normalizedSearch}%"])
                    ->orWhereRaw('LOWER(COALESCE(search_text, \'\')) LIKE ?', ["%{$normalizedSearch}%"]);
            });
        }

        if ($category !== '') {
            $query->whereJsonContains('categories', $category);
        }

        $avatars = $query->paginate($perPage)->withQueryString();
        $lastSyncedAt = HeyGenPublicAvatar::query()->whereNotNull('synced_at')->max('synced_at');

        return response()->json([
            'data' => PublicAvatarResource::collection($avatars->getCollection())->resolve(),
            'current_page' => $avatars->currentPage(),
            'last_page' => $avatars->lastPage(),
            'per_page' => $avatars->perPage(),
            'total' => $avatars->total(),
            'meta' => [
                'categories' => $this->categories(),
                'last_synced_at' => $lastSyncedAt,
            ],
        ]);
    }

    /**
     * @return array<int, string>
     */
    private function categories(): array
    {
        /** @var array<int, string> $categories */
        $categories = Cache::remember('heygen:public-avatars:categories', now()->addMinutes(30), function (): array {
            $values = [];

            HeyGenPublicAvatar::query()
                ->where('is_active', true)
                ->pluck('categories')
                ->each(function ($categories) use (&$values): void {
                    if (is_string($categories)) {
                        $decoded = json_decode($categories, true);
                        $categories = is_array($decoded) ? $decoded : [];
                    }

                    if (! is_array($categories)) {
                        return;
                    }

                    foreach ($categories as $category) {
                        if (is_string($category) && trim($category) !== '') {
                            $values[] = trim($category);
                        }
                    }
                });

            $values = array_values(array_unique($values));
            sort($values);

            return $values;
        });

        return $categories;
    }
}
