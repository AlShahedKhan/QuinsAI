<?php

namespace App\Http\Controllers\Api\HeyGen;

use App\Domain\HeyGen\HeyGenLiveSessionWorkflowService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\HeyGen\CreateLiveSessionRequest;
use App\Http\Resources\HeyGen\LiveSessionResource;
use App\Models\HeyGenLiveSession;
use App\Services\HeyGen\HeyGenException;
use App\Services\HeyGen\HeyGenQuotaException;
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
            $quota = $this->quotaService->ensureLiveMinutesAvailable($user);
        } catch (HeyGenQuotaException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
                'error' => [
                    'code' => 'quota_exceeded',
                ],
            ], Response::HTTP_TOO_MANY_REQUESTS);
        }

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
            'quota' => $quota,
        ], Response::HTTP_CREATED);
    }

    public function quota(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_if($user === null, Response::HTTP_UNAUTHORIZED);

        return response()->json([
            'data' => $this->quotaService->liveMinuteQuota($user),
        ]);
    }

    public function activate(Request $request, HeyGenLiveSession $liveSession): JsonResponse
    {
        $user = $request->user();
        abort_if($user === null, Response::HTTP_UNAUTHORIZED);
        abort_if($liveSession->user_id !== $user->id, Response::HTTP_NOT_FOUND);

        $session = $this->workflowService->markSessionActive($liveSession);

        return response()->json([
            'data' => new LiveSessionResource($session),
        ]);
    }

    public function end(Request $request, HeyGenLiveSession $liveSession): JsonResponse
    {
        $user = $request->user();
        abort_if($user === null, Response::HTTP_UNAUTHORIZED);
        abort_if($liveSession->user_id !== $user->id, Response::HTTP_NOT_FOUND);

        $wasOpen = $liveSession->ended_at === null;
        $startedAt = $liveSession->started_at;

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

        if ($wasOpen) {
            $minutes = 0;

            if ($startedAt !== null) {
                $endedAt = $endedSession->ended_at ?? now();
                $seconds = max(0, $startedAt->diffInSeconds($endedAt));
                $minutes = (int) ceil($seconds / 60);
            }

            if ($minutes > 0) {
                $this->quotaService->recordLiveMinutes($user, $minutes);
            }
        }

        return response()->json([
            'data' => new LiveSessionResource($endedSession),
            'quota' => $this->quotaService->liveMinuteQuota($user),
        ]);
    }
}
