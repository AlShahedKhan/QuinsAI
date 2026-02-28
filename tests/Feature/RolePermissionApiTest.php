<?php

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function actingAsSuperAdmin(): User
{
    $admin = User::factory()->admin()->create();
    $admin->assignRole('super-admin');
    Sanctum::actingAs($admin);

    return $admin;
}

test('role and permission endpoints require authentication', function () {
    $this->getJson('/api/admin/roles')->assertUnauthorized();
    $this->getJson('/api/admin/permissions')->assertUnauthorized();
});

test('non super-admin cannot access role and permission endpoints', function () {
    $this->seed(RolePermissionSeeder::class);

    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->getJson('/api/admin/roles')->assertForbidden();
    $this->getJson('/api/admin/permissions')->assertForbidden();
});

test('permission scoped access allows read but denies write without proper permission', function () {
    $this->seed(RolePermissionSeeder::class);

    $auditor = User::factory()->create();
    $auditor->givePermissionTo('roles.view');
    Sanctum::actingAs($auditor);

    $this->getJson('/api/admin/roles')->assertOk();
    $this->postJson('/api/admin/roles', [
        'name' => 'auditor-role',
        'permissions' => ['roles.view'],
    ])->assertForbidden();
});

test('super-admin can create update and delete role', function () {
    $this->seed(RolePermissionSeeder::class);
    actingAsSuperAdmin();

    $created = $this->postJson('/api/admin/roles', [
        'name' => 'security-manager',
        'permissions' => ['roles.view', 'permissions.view'],
    ])->assertCreated()
        ->assertJsonPath('data.name', 'security-manager');

    $roleId = (int) $created->json('data.id');

    $this->putJson("/api/admin/roles/{$roleId}", [
        'name' => 'security-admin',
        'permissions' => ['roles.view'],
    ])->assertOk()
        ->assertJsonPath('data.name', 'security-admin')
        ->assertJsonPath('data.permissions.0', 'roles.view');

    $this->deleteJson("/api/admin/roles/{$roleId}")
        ->assertOk()
        ->assertJsonPath('message', 'Role deleted successfully.');
});

test('super-admin role cannot be deleted', function () {
    $this->seed(RolePermissionSeeder::class);
    actingAsSuperAdmin();

    $role = \Spatie\Permission\Models\Role::findByName('super-admin', 'sanctum');

    $this->deleteJson("/api/admin/roles/{$role->id}")
        ->assertUnprocessable()
        ->assertJsonPath('error.code', 'protected_role');
});

test('super-admin role cannot be modified', function () {
    $this->seed(RolePermissionSeeder::class);
    actingAsSuperAdmin();

    $role = \Spatie\Permission\Models\Role::findByName('super-admin', 'sanctum');

    $this->putJson("/api/admin/roles/{$role->id}", [
        'name' => 'root',
        'permissions' => ['roles.view'],
    ])->assertUnprocessable()
        ->assertJsonPath('error.code', 'protected_role');
});

test('permission crud works and blocks deleting in-use permissions', function () {
    $this->seed(RolePermissionSeeder::class);
    actingAsSuperAdmin();

    $created = $this->postJson('/api/admin/permissions', [
        'name' => 'reports.view',
    ])->assertCreated()
        ->assertJsonPath('data.name', 'reports.view');

    $permissionId = (int) $created->json('data.id');

    $this->putJson("/api/admin/permissions/{$permissionId}", [
        'name' => 'reports.read',
    ])->assertOk()
        ->assertJsonPath('data.name', 'reports.read');

    $this->postJson('/api/admin/roles', [
        'name' => 'reports-manager',
        'permissions' => ['reports.read'],
    ])->assertCreated();

    $this->deleteJson("/api/admin/permissions/{$permissionId}")
        ->assertUnprocessable()
        ->assertJsonPath('error.code', 'permission_in_use');
});

test('system permissions cannot be renamed or deleted', function () {
    $this->seed(RolePermissionSeeder::class);
    actingAsSuperAdmin();

    $permission = \Spatie\Permission\Models\Permission::findByName('roles.view', 'sanctum');

    $this->putJson("/api/admin/permissions/{$permission->id}", [
        'name' => 'roles.inspect',
    ])->assertUnprocessable()
        ->assertJsonPath('error.code', 'protected_permission');

    $this->deleteJson("/api/admin/permissions/{$permission->id}")
        ->assertUnprocessable()
        ->assertJsonPath('error.code', 'protected_permission');
});
