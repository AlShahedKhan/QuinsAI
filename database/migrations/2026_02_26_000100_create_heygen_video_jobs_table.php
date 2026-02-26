<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('heygen_video_jobs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('provider_video_id')->nullable()->unique();
            $table->string('avatar_id');
            $table->string('voice_id');
            $table->text('script');
            $table->string('status')->default('queued')->index();
            $table->string('error_code')->nullable();
            $table->text('error_message')->nullable();
            $table->json('provider_payload')->nullable();
            $table->string('output_provider_url')->nullable();
            $table->string('output_storage_url')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('heygen_video_jobs');
    }
};
