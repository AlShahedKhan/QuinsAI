<?php

namespace App\Services\HeyGen;

use App\Models\HeyGenUsageDaily;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class HeyGenQuotaService
{
    public function consumeVideoRequest(User $user): HeyGenUsageDaily
    {
        return DB::transaction(function () use ($user): HeyGenUsageDaily {
            $record = $this->resolveRecordForUpdate($user);

            if ($record->blocked_until !== null && $record->blocked_until->isFuture()) {
                throw new HeyGenQuotaException('Video generation is temporarily blocked for this account.');
            }

            if ($record->video_requests >= $record->daily_request_limit) {
                $record->blocked_until = now()->endOfDay();
                $record->save();

                throw new HeyGenQuotaException('Daily HeyGen video request quota reached.');
            }

            $record->increment('video_requests');
            $record->refresh();

            return $record;
        });
    }

    public function recordLiveMinutes(User $user, int $minutes): HeyGenUsageDaily
    {
        return DB::transaction(function () use ($user, $minutes): HeyGenUsageDaily {
            $record = $this->resolveRecordForUpdate($user);
            $record->live_session_minutes += max(0, $minutes);
            $record->save();

            return $record;
        });
    }

    public function remainingVideoRequests(User $user): int
    {
        $record = HeyGenUsageDaily::query()
            ->where('user_id', $user->id)
            ->whereDate('usage_date', now()->toDateString())
            ->first();

        if ($record === null) {
            return (int) config('services.heygen.daily_request_limit', 5);
        }

        return max(0, $record->daily_request_limit - $record->video_requests);
    }

    private function resolveRecordForUpdate(User $user): HeyGenUsageDaily
    {
        $today = CarbonImmutable::today()->toDateString();

        $record = HeyGenUsageDaily::query()
            ->where('user_id', $user->id)
            ->whereDate('usage_date', $today)
            ->lockForUpdate()
            ->first();

        if ($record !== null) {
            return $record;
        }

        return HeyGenUsageDaily::query()->create([
            'user_id' => $user->id,
            'usage_date' => $today,
            'daily_request_limit' => (int) config('services.heygen.daily_request_limit', 5),
            'daily_minute_limit' => (int) config('services.heygen.daily_live_minute_limit', 30),
        ]);
    }
}
