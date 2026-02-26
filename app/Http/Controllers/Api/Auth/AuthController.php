<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Auth\LoginRequest;
use App\Http\Requests\Api\Auth\RegisterRequest;
use App\Models\User;
use App\Services\Auth\AccessTokenService;
use App\Services\Auth\InvalidRefreshTokenException;
use App\Services\Auth\RefreshTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpFoundation\Response;

class AuthController extends Controller
{
    public function __construct(
        private readonly AccessTokenService $accessTokenService,
        private readonly RefreshTokenService $refreshTokenService,
    ) {
    }

    public function register(RegisterRequest $request): JsonResponse
    {
        $payload = $request->validated();

        $user = User::query()->create([
            'name' => (string) $payload['name'],
            'email' => mb_strtolower((string) $payload['email']),
            'password' => (string) $payload['password'],
        ]);

        return response()->json([
            'message' => 'Registration completed. You can now sign in.',
            'data' => [
                'user' => $this->serializeUser($user),
                'verification_sent' => false,
            ],
        ], Response::HTTP_CREATED);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $payload = $request->validated();

        $user = User::query()
            ->where('email', mb_strtolower((string) $payload['email']))
            ->first();

        if ($user === null || ! Hash::check((string) $payload['password'], (string) $user->password)) {
            return response()->json([
                'message' => 'The provided credentials are incorrect.',
                'error' => [
                    'code' => 'invalid_credentials',
                ],
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $tokenPayload = $this->accessTokenService->issue($user, 'api-login');
        $refreshToken = $this->refreshTokenService->issue($user, $request);

        return response()->json([
            'data' => array_merge($tokenPayload, [
                'user' => $this->serializeUser($user),
            ]),
        ], Response::HTTP_OK)->withCookie($this->refreshTokenService->makeCookie($refreshToken));
    }

    public function refresh(Request $request): JsonResponse
    {
        try {
            $rotation = $this->refreshTokenService->rotateFromRequest($request);
        } catch (InvalidRefreshTokenException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
                'error' => [
                    'code' => 'invalid_refresh_token',
                ],
            ], Response::HTTP_UNAUTHORIZED)->withCookie($this->refreshTokenService->forgetCookie());
        }

        $user = $rotation['user'];
        $tokenPayload = $this->accessTokenService->issue($user, 'api-refresh');

        return response()->json([
            'data' => array_merge($tokenPayload, [
                'user' => $this->serializeUser($user),
            ]),
        ])->withCookie($this->refreshTokenService->makeCookie($rotation['refresh_token']));
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_if($user === null, Response::HTTP_UNAUTHORIZED);

        return response()->json([
            'data' => [
                'user' => $this->serializeUser($user),
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_if($user === null, Response::HTTP_UNAUTHORIZED);

        $this->accessTokenService->revokeCurrent($request);
        $this->refreshTokenService->revokeFromRequest($request);

        return response()->json([
            'message' => 'Logged out successfully.',
        ])->withCookie($this->refreshTokenService->forgetCookie());
    }

    public function logoutAll(Request $request): JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user();
        abort_if($user === null, Response::HTTP_UNAUTHORIZED);

        $this->accessTokenService->revokeAll($user);
        $this->refreshTokenService->revokeAllForUser($user);

        return response()->json([
            'message' => 'All sessions revoked.',
        ])->withCookie($this->refreshTokenService->forgetCookie());
    }

    /**
     * @return array{id: int, name: string, email: string, email_verified_at: ?string}
     */
    private function serializeUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'email_verified_at' => $user->email_verified_at?->toIso8601String(),
        ];
    }
}
