<?php

use App\Models\User;
use Database\Seeders\AdminUserSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('admin seeder creates admin user', function () {
    $this->seed(RolePermissionSeeder::class);
    $this->seed(AdminUserSeeder::class);

    $admin = User::query()->where('email', 'admin@quinsai.test')->first();

    expect($admin)->not->toBeNull();
    expect($admin?->is_admin)->toBeTrue();
    expect($admin?->hasRole('super-admin'))->toBeTrue();
});
