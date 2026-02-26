<?php

namespace App\Http\Controllers\Api\HeyGen;

use App\Domain\HeyGen\HeyGenLiveSessionWorkflowService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\HeyGen\CreateLiveSessionRequest;
use App\Http\Resources\HeyGen\LiveSessionResource;
use App\Models\HeyGenLiveSession;
use App\Services\HeyGen\HeyGenException;
use App\Services\HeyGen\HeyGenQuotaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class LiveSessionController extends Controller
{
    public function __construct(
        private readonly HeyGenLiveSessionWorkflowService $workflowService,
        private readonly HeyGenQuotaService $quotaService,
    ) {
    }

    public function store(CreateLiveSessionRequest $request): JsonResponse
    {
        $user = $request->user();
        abort_if($user === null, Response::HTTP_UNAUTHORIZED);

        try {
            $session = $this->workflowService->createSession($user, $request->validated());
        } catch (HeyGenException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
                'error' => [
                    'code' => 'live_session_create_failed',
                    'context' => $exception->context,
                ],
            ], Response::HTTP_BAD_GATEWAY);
        }

        return response()->json([
            'data' => new LiveSessionResource($session),
        ], Response::HTTP_CREATED);
    }

    public function end(Request $request, HeyGenLiveSession $liveSession): JsonResponse
    {
        $user = $request->user();
        abort_if($user === null, Response::HTTP_UNAUTHORIZED);
        abort_if($liveSession->user_id !== $user->id, Response::HTTP_NOT_FOUND);

        try {
            $endedSession = $this->workflowService->endSession($liveSession);
        } catch (HeyGenException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
                'error' => [
                    'code' => 'live_session_end_failed',
                ],
            ], Response::HTTP_BAD_GATEWAY);
        }

        $minutes = max(1, (int) ceil(optional($liveSession->started_at)->diffInSeconds(now()) / 60));
        $this->quotaService->recordLiveMinutes($user, $minutes);

        return response()->json([
            'data' => new LiveSessionResource($endedSession),
        ]);
    }
}
