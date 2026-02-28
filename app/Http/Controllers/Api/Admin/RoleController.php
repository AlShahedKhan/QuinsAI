<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Admin\StoreRoleRequest;
use App\Http\Requests\Api\Admin\UpdateRoleRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Spatie\Permission\PermissionRegistrar;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function index(): JsonResponse
    {
        $roles = Role::query()
            ->where('guard_name', 'sanctum')
            ->with('permissions:id,name')
            ->withCount('users')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $roles->map(fn (Role $role) => $this->serializeRole($role))->values(),
        ]);
    }

    public function store(StoreRoleRequest $request): JsonResponse
    {
        $payload = $request->validated();

        if ((string) $payload['name'] === 'super-admin') {
            return response()->json([
                'message' => 'The super-admin role is reserved and cannot be created via API.',
                'error' => [
                    'code' => 'protected_role',
                ],
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $permissions = is_array($payload['permissions'] ?? null) ? $payload['permissions'] : [];

        /** @var Role $role */
        $role = DB::transaction(function () use ($payload, $permissions): Role {
            $role = Role::query()->create([
                'name' => (string) $payload['name'],
                'guard_name' => 'sanctum',
            ]);

            $role->syncPermissions($permissions);
            app(PermissionRegistrar::class)->forgetCachedPermissions();

            return $role;
        });

        Log::info('Security: role created', [
            'actor_user_id' => $request->user()?->id,
            'ip' => $request->ip(),
            'role' => $role->name,
            'permissions' => $permissions,
        ]);

        $role->load('permissions:id,name');
        $role->loadCount('users');

        return response()->json([
            'data' => $this->serializeRole($role),
        ], Response::HTTP_CREATED);
    }

    public function show(Role $role): JsonResponse
    {
        abort_unless($role->guard_name === 'sanctum', Response::HTTP_NOT_FOUND);
        $role->load('permissions:id,name');

        return response()->json([
            'data' => $this->serializeRole($role),
        ]);
    }

    public function update(UpdateRoleRequest $request, Role $role): JsonResponse
    {
        abort_unless($role->guard_name === 'sanctum', Response::HTTP_NOT_FOUND);
        if ($role->name === 'super-admin') {
            return response()->json([
                'message' => 'The super-admin role is immutable.',
                'error' => [
                    'code' => 'protected_role',
                ],
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $payload = $request->validated();
        $permissions = is_array($payload['permissions'] ?? null) ? $payload['permissions'] : [];

        DB::transaction(function () use ($role, $payload, $permissions): void {
            $role->name = (string) $payload['name'];
            $role->save();
            $role->syncPermissions($permissions);
            app(PermissionRegistrar::class)->forgetCachedPermissions();
        });

        Log::info('Security: role updated', [
            'actor_user_id' => $request->user()?->id,
            'ip' => $request->ip(),
            'role_id' => $role->id,
            'role_name' => $role->name,
            'permissions' => $permissions,
        ]);

        $role->load('permissions:id,name');
        $role->loadCount('users');

        return response()->json([
            'data' => $this->serializeRole($role),
        ]);
    }

    public function destroy(Role $role): JsonResponse
    {
        abort_unless($role->guard_name === 'sanctum', Response::HTTP_NOT_FOUND);

        if ($role->name === 'super-admin') {
            return response()->json([
                'message' => 'The super-admin role cannot be deleted.',
                'error' => [
                    'code' => 'protected_role',
                ],
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if ($role->users()->exists()) {
            return response()->json([
                'message' => 'Role is still assigned to users. Remove assignments first.',
                'error' => [
                    'code' => 'role_in_use',
                ],
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        DB::transaction(function () use ($role): void {
            $role->delete();
            app(PermissionRegistrar::class)->forgetCachedPermissions();
        });

        Log::warning('Security: role deleted', [
            'actor_user_id' => request()->user()?->id,
            'ip' => request()->ip(),
            'role_id' => $role->id,
            'role_name' => $role->name,
        ]);

        return response()->json([
            'message' => 'Role deleted successfully.',
        ]);
    }

    /**
     * @return array{id: int, name: string, guard_name: string, permissions: array<int, string>, users_count: int}
     */
    private function serializeRole(Role $role): array
    {
        return [
            'id' => (int) $role->id,
            'name' => (string) $role->name,
            'guard_name' => (string) $role->guard_name,
            'permissions' => $role->permissions->pluck('name')->sort()->values()->all(),
            'users_count' => (int) ($role->users_count ?? $role->users()->count()),
        ];
    }
}
