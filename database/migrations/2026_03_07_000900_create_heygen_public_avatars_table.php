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
        Schema::create('heygen_public_avatars', function (Blueprint $table): void {
            $table->id();
            $table->string('provider_avatar_id')->unique();
            $table->string('name')->index();
            $table->string('preview_image_url')->nullable();
            $table->unsignedInteger('looks_count')->nullable();
            $table->json('categories')->nullable();
            $table->text('search_text')->nullable();
            $table->json('provider_payload')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamp('synced_at')->nullable()->index();
            $table->timestamps();

            $table->index(['is_active', 'name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('heygen_public_avatars');
    }
};
