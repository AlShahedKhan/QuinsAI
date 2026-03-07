<?php

namespace App\Http\Controllers\Api\HeyGen;

use App\Http\Controllers\Controller;
use App\Models\HeyGenPublicAvatar;
use App\Services\HeyGen\HeyGenPublicAvatarDetailService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class PublicAvatarDetailController extends Controller
{
    public function __construct(
        private readonly HeyGenPublicAvatarDetailService $detailService,
    ) {
    }

    public function __invoke(string $avatarId): JsonResponse
    {
        $avatar = HeyGenPublicAvatar::query()
            ->where('provider_avatar_id', $avatarId)
            ->where('is_active', true)
            ->first();

        abort_if($avatar === null, Response::HTTP_NOT_FOUND);

        return response()->json([
            'data' => $this->detailService->getDetails($avatar),
        ]);
    }
}
