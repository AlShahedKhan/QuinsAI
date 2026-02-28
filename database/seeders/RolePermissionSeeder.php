<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionSeeder extends Seeder
{
    /**
     * @var array<int, string>
     */
    private const PERMISSIONS = [
        'roles.view',
        'roles.create',
        'roles.update',
        'roles.delete',
        'permissions.view',
        'permissions.create',
        'permissions.update',
        'permissions.delete',
    ];

    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (self::PERMISSIONS as $permissionName) {
            Permission::findOrCreate($permissionName, 'sanctum');
        }

        $superAdminRole = Role::findOrCreate('super-admin', 'sanctum');
        $superAdminRole->syncPermissions(Permission::query()->where('guard_name', 'sanctum')->pluck('name')->all());
    }
}
