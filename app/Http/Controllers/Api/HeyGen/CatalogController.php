<?php

namespace App\Http\Controllers\Api\HeyGen;

use App\Http\Controllers\Controller;
use App\Services\HeyGen\HeyGenCatalogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CatalogController extends Controller
{
    public function __construct(
        private readonly HeyGenCatalogService $catalogService,
    ) {
    }

    public function __invoke(Request $request): JsonResponse
    {
        if (function_exists('set_time_limit')) {
            @set_time_limit(max(30, (int) config('services.heygen.catalog_max_execution_seconds', 180)));
        }

        $include = strtolower((string) $request->query('include', 'all'));

        $data = match ($include) {
            'avatars' => [
                'avatars' => $this->catalogService->getAvatars(),
                'voices' => [],
            ],
            'voices' => [
                'avatars' => [],
                'voices' => $this->catalogService->getVoices(),
            ],
            default => $this->catalogService->getCatalog(),
        };

        return response()->json([
            'data' => $data,
        ]);
    }
}
