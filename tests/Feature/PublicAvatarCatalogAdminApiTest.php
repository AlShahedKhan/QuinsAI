<?php

use App\Models\HeyGenPublicAvatar;
use App\Models\User;
use App\Services\HeyGen\HeyGenPublicAvatarSyncService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Mockery\MockInterface;

uses(RefreshDatabase::class);

function actingAsCatalogAdmin(): User
{
    $admin = User::factory()->admin()->create();
    $admin->assignRole('super-admin');
    Sanctum::actingAs($admin);

    return $admin;
}

test('public avatar catalog admin endpoints require admin access', function () {
    $this->getJson('/api/admin/heygen/public-avatars')->assertUnauthorized();

    $this->seed(RolePermissionSeeder::class);

    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->getJson('/api/admin/heygen/public-avatars')->assertForbidden();
    $this->postJson('/api/admin/heygen/public-avatars/sync')->assertForbidden();
});

test('admin can view public avatar catalog stats', function () {
    $this->seed(RolePermissionSeeder::class);
    actingAsCatalogAdmin();

    HeyGenPublicAvatar::query()->create([
        'provider_avatar_id' => 'avatar_annie',
        'name' => 'Annie',
        'categories' => ['Professional'],
        'provider_payload' => ['preview_video_url' => 'https://cdn.example.com/annie.mp4'],
        'is_active' => true,
        'synced_at' => now(),
    ]);

    $this->getJson('/api/admin/heygen/public-avatars')
        ->assertOk()
        ->assertJsonPath('data.active', 1)
        ->assertJsonPath('data.preview_video_count', 1)
        ->assertJsonPath('data.looks_support.public_avatar_api_exposes_looks', false);
});

test('admin can trigger public avatar catalog sync', function () {
    $this->seed(RolePermissionSeeder::class);
    actingAsCatalogAdmin();

    $this->mock(HeyGenPublicAvatarSyncService::class, function (MockInterface $mock): void {
        $mock->shouldReceive('sync')
            ->once()
            ->andReturn([
                'synced' => 25,
                'activated' => 25,
                'deactivated' => 0,
            ]);
    });

    $this->postJson('/api/admin/heygen/public-avatars/sync')
        ->assertOk()
        ->assertJsonPath('message', 'Public avatar catalog synced successfully.')
        ->assertJsonPath('summary.synced', 25);
});
