<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('heygen_video_agent_jobs', function (Blueprint $table): void {
            $table->string('avatar_id')->nullable()->after('user_id');
            $table->string('voice_id')->nullable()->after('avatar_id');
        });
    }

    public function down(): void
    {
        Schema::table('heygen_video_agent_jobs', function (Blueprint $table): void {
            $table->dropColumn(['avatar_id', 'voice_id']);
        });
    }
};
