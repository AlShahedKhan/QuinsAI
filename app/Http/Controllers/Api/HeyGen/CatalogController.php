<?php

namespace App\Http\Controllers\Api\HeyGen;

use App\Http\Controllers\Controller;
use App\Services\HeyGen\HeyGenCatalogService;
use Illuminate\Http\JsonResponse;

class CatalogController extends Controller
{
    public function __construct(
        private readonly HeyGenCatalogService $catalogService,
    ) {
    }

    public function __invoke(): JsonResponse
    {
        return response()->json([
            'data' => $this->catalogService->getCatalog(),
        ]);
    }
}
