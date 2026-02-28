<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Admin\StorePermissionRequest;
use App\Http\Requests\Api\Admin\UpdatePermissionRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Spatie\Permission\PermissionRegistrar;
use Spatie\Permission\Models\Permission;

class PermissionController extends Controller
{
    /**
     * @var array<int, string>
     */
    private const PROTECTED_PERMISSIONS = [
        'roles.view',
        'roles.create',
        'roles.update',
        'roles.delete',
        'permissions.view',
        'permissions.create',
        'permissions.update',
        'permissions.delete',
    ];

    public function index(): JsonResponse
    {
        $permissions = Permission::query()
            ->where('guard_name', 'sanctum')
            ->withCount('roles')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $permissions->map(fn (Permission $permission) => $this->serializePermission($permission))->values(),
        ]);
    }

    public function store(StorePermissionRequest $request): JsonResponse
    {
        $payload = $request->validated();

        /** @var Permission $permission */
        $permission = DB::transaction(function () use ($payload): Permission {
            $permission = Permission::query()->create([
                'name' => (string) $payload['name'],
                'guard_name' => 'sanctum',
            ]);
            app(PermissionRegistrar::class)->forgetCachedPermissions();

            return $permission;
        });

        Log::info('Security: permission created', [
            'actor_user_id' => $request->user()?->id,
            'ip' => $request->ip(),
            'permission' => $permission->name,
        ]);

        $permission->loadCount('roles');

        return response()->json([
            'data' => $this->serializePermission($permission),
        ], Response::HTTP_CREATED);
    }

    public function show(Permission $permission): JsonResponse
    {
        abort_unless($permission->guard_name === 'sanctum', Response::HTTP_NOT_FOUND);
        $permission->loadCount('roles');

        return response()->json([
            'data' => $this->serializePermission($permission),
        ]);
    }

    public function update(UpdatePermissionRequest $request, Permission $permission): JsonResponse
    {
        abort_unless($permission->guard_name === 'sanctum', Response::HTTP_NOT_FOUND);
        if (in_array($permission->name, self::PROTECTED_PERMISSIONS, true)) {
            return response()->json([
                'message' => 'This system permission is immutable.',
                'error' => [
                    'code' => 'protected_permission',
                ],
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $payload = $request->validated();

        DB::transaction(function () use ($permission, $payload): void {
            $permission->name = (string) $payload['name'];
            $permission->save();
            app(PermissionRegistrar::class)->forgetCachedPermissions();
        });

        Log::info('Security: permission updated', [
            'actor_user_id' => $request->user()?->id,
            'ip' => $request->ip(),
            'permission_id' => $permission->id,
            'permission_name' => $permission->name,
        ]);

        $permission->loadCount('roles');

        return response()->json([
            'data' => $this->serializePermission($permission),
        ]);
    }

    public function destroy(Permission $permission): JsonResponse
    {
        abort_unless($permission->guard_name === 'sanctum', Response::HTTP_NOT_FOUND);
        if (in_array($permission->name, self::PROTECTED_PERMISSIONS, true)) {
            return response()->json([
                'message' => 'This system permission cannot be deleted.',
                'error' => [
                    'code' => 'protected_permission',
                ],
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if ($permission->roles()->exists()) {
            return response()->json([
                'message' => 'Permission is assigned to one or more roles.',
                'error' => [
                    'code' => 'permission_in_use',
                ],
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        DB::transaction(function () use ($permission): void {
            $permission->delete();
            app(PermissionRegistrar::class)->forgetCachedPermissions();
        });

        Log::warning('Security: permission deleted', [
            'actor_user_id' => request()->user()?->id,
            'ip' => request()->ip(),
            'permission_id' => $permission->id,
            'permission_name' => $permission->name,
        ]);

        return response()->json([
            'message' => 'Permission deleted successfully.',
        ]);
    }

    /**
     * @return array{id: int, name: string, guard_name: string, roles_count: int}
     */
    private function serializePermission(Permission $permission): array
    {
        return [
            'id' => (int) $permission->id,
            'name' => (string) $permission->name,
            'guard_name' => (string) $permission->guard_name,
            'roles_count' => (int) $permission->roles_count,
        ];
    }
}
