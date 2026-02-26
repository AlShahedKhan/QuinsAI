<?php

namespace App\Http\Controllers\Api\HeyGen;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessHeyGenWebhookEventJob;
use App\Models\HeyGenWebhookEvent;
use App\Services\HeyGen\HeyGenWebhookSignatureService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class WebhookController extends Controller
{
    public function __construct(
        private readonly HeyGenWebhookSignatureService $signatureService,
    ) {
    }

    public function __invoke(Request $request): JsonResponse
    {
        $payload = $request->all();
        $eventType = (string) (Arr::get($payload, 'event_type') ?? Arr::get($payload, 'type') ?? 'unknown');
        $providerEventId = (string) (
            Arr::get($payload, 'event_id')
            ?? Arr::get($payload, 'id')
            ?? sha1($request->getContent())
        );

        $signatureValid = $this->signatureService->isValid($request);

        $event = HeyGenWebhookEvent::query()->firstOrCreate(
            ['provider_event_id' => $providerEventId],
            [
                'event_type' => $eventType,
                'signature_valid' => $signatureValid,
                'payload' => $payload,
                'received_at' => now(),
            ]
        );

        if (! $signatureValid) {
            Log::warning('Rejected HeyGen webhook due to invalid signature.', [
                'provider_event_id' => $providerEventId,
                'event_type' => $eventType,
            ]);

            if (! $event->exists) {
                $event->save();
            }

            return response()->json([
                'message' => 'Invalid HeyGen webhook signature.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        if ($event->wasRecentlyCreated) {
            ProcessHeyGenWebhookEventJob::dispatch($event->id);
        }

        return response()->json([
            'acknowledged' => true,
        ], Response::HTTP_ACCEPTED);
    }
}
