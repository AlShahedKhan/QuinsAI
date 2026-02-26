<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureApiEmailIsVerified
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null || $user->hasVerifiedEmail()) {
            return $next($request);
        }

        return new JsonResponse([
            'message' => 'Email address must be verified before using this endpoint.',
            'error' => [
                'code' => 'email_unverified',
            ],
        ], Response::HTTP_FORBIDDEN);
    }
}
