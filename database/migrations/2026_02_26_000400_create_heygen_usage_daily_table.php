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
        Schema::create('heygen_usage_daily', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('usage_date');
            $table->unsignedInteger('video_requests')->default(0);
            $table->unsignedInteger('live_session_minutes')->default(0);
            $table->unsignedInteger('cost_units')->default(0);
            $table->unsignedInteger('daily_request_limit');
            $table->unsignedInteger('daily_minute_limit');
            $table->timestamp('blocked_until')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'usage_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('heygen_usage_daily');
    }
};
