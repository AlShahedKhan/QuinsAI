<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

class AdminUserSeeder extends Seeder
{
    /**
     * Seed the application's database with an admin user.
     */
    public function run(): void
    {
        $name = (string) env('ADMIN_NAME', 'QuinsAI Admin');
        $email = mb_strtolower((string) env('ADMIN_EMAIL', 'admin@quinsai.test'));
        $password = trim((string) env('ADMIN_PASSWORD', ''));

        $admin = User::query()->firstOrNew(['email' => $email]);
        $isNewAdmin = ! $admin->exists;

        $admin->name = $name;
        $admin->email_verified_at = now();
        $admin->forceFill(['is_admin' => true]);

        if ($password !== '') {
            $admin->password = Hash::make($password);
        } elseif ($isNewAdmin) {
            $generatedPassword = Str::password(24);
            $admin->password = Hash::make($generatedPassword);
            $this->command?->warn("ADMIN_PASSWORD was not set. Generated temporary admin password: {$generatedPassword}");
        }

        $admin->save();

        Role::findOrCreate('super-admin', 'sanctum');
        $admin->syncRoles(['super-admin']);
    }
}
