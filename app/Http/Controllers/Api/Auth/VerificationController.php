<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerificationController extends Controller
{
    public function verify(Request $request, int $id, string $hash): RedirectResponse
    {
        $user = User::query()->findOrFail($id);

        if (! hash_equals((string) $hash, sha1($user->getEmailForVerification()))) {
            abort(Response::HTTP_FORBIDDEN);
        }

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
            event(new Verified($user));
        }

        return redirect()->away($this->frontendLoginUrlWithQuery(['verified' => 1]));
    }

    public function resend(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_if($user === null, Response::HTTP_UNAUTHORIZED);

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Email address already verified.',
                'data' => [
                    'email_verified' => true,
                ],
            ]);
        }

        $user->sendEmailVerificationNotification();

        return response()->json([
            'message' => 'Verification email sent.',
        ]);
    }

    /**
     * @param  array<string, string|int>  $query
     */
    private function frontendLoginUrlWithQuery(array $query): string
    {
        $base = rtrim((string) config('app.frontend_url', config('app.url')), '/');
        $url = $base.'/login';

        return $url.'?'.http_build_query($query);
    }
}
