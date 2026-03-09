<?php

namespace App\Http\Controllers\Api\HeyGen;

use App\Domain\HeyGen\Enums\DigitalTwinStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\HeyGen\StoreDigitalTwinRequest;
use App\Http\Resources\HeyGen\DigitalTwinResource;
use App\Jobs\SubmitHeyGenDigitalTwinJob;
use App\Models\HeyGenDigitalTwin;
use App\Services\HeyGen\HeyGenDigitalTwinMediaService;
use App\Services\HeyGen\HeyGenQuotaException;
use App\Services\HeyGen\HeyGenQuotaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class DigitalTwinController extends Controller
{
    public function __construct(
        private readonly HeyGenQuotaService $quotaService,
        private readonly HeyGenDigitalTwinMediaService $mediaService,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_if($user === null, Response::HTTP_UNAUTHORIZED);

        $validated = $request->validate([
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
            'status' => ['nullable', 'string', Rule::in(array_map(
                static fn (DigitalTwinStatus $status): string => $status->value,
                DigitalTwinStatus::cases(),
            ))],
        ]);

        $digitalTwinsQuery = HeyGenDigitalTwin::query()
            ->where('user_id', $user->id)
            ->latest();

        if (isset($validated['status'])) {
            $digitalTwinsQuery->where('status', $validated['status']);
        }

        $digitalTwins = $digitalTwinsQuery->paginate((int) ($validated['per_page'] ?? 20));

        return response()->json([
            'data' => $digitalTwins->getCollection()
                ->map(static fn (HeyGenDigitalTwin $digitalTwin): array => (new DigitalTwinResource($digitalTwin))->resolve())
                ->values(),
            'current_page' => $digitalTwins->currentPage(),
            'last_page' => $digitalTwins->lastPage(),
            'per_page' => $digitalTwins->perPage(),
            'total' => $digitalTwins->total(),
        ]);
    }

    public function show(Request $request, HeyGenDigitalTwin $digitalTwin): DigitalTwinResource
    {
        $user = $request->user();
        abort_if($user === null, Response::HTTP_UNAUTHORIZED);
        abort_if($digitalTwin->user_id !== $user->id, Response::HTTP_NOT_FOUND);

        return new DigitalTwinResource($digitalTwin);
    }

    public function store(StoreDigitalTwinRequest $request): JsonResponse
    {
        $user = $request->user();
        abort_if($user === null, Response::HTTP_UNAUTHORIZED);

        $payload = $request->validated();
        $trainingFootage = $request->file('training_footage');
        $consentVideo = $request->file('video_consent');

        if ($trainingFootage === null || $consentVideo === null) {
            return response()->json([
                'message' => 'Training footage and consent video are required.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        try {
            $quota = $this->quotaService->consumeDigitalTwinRequest($user);
        } catch (HeyGenQuotaException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
                'error' => [
                    'code' => 'quota_exceeded',
                ],
            ], Response::HTTP_TOO_MANY_REQUESTS);
        }

        $storedMedia = $this->mediaService->storeMedia($trainingFootage, $consentVideo, $user->id);

        $digitalTwin = HeyGenDigitalTwin::query()->create([
            'user_id' => $user->id,
            'avatar_name' => (string) $payload['avatar_name'],
            'training_video_path' => $storedMedia['training_video_path'],
            'consent_video_path' => $storedMedia['consent_video_path'],
            'status' => DigitalTwinStatus::Queued,
        ]);

        SubmitHeyGenDigitalTwinJob::dispatch($digitalTwin->id);

        return response()->json([
            'data' => new DigitalTwinResource($digitalTwin),
            'quota' => [
                'daily_digital_twin_limit' => $quota->daily_digital_twin_limit,
                'digital_twin_requests_used' => $quota->digital_twin_requests,
                'digital_twin_requests_remaining' => max(0, $quota->daily_digital_twin_limit - $quota->digital_twin_requests),
            ],
        ], Response::HTTP_ACCEPTED);
    }
}
