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
        Schema::table('heygen_usage_daily', function (Blueprint $table): void {
            $table->unsignedInteger('digital_twin_requests')->default(0)->after('video_requests');
            $table->unsignedInteger('daily_digital_twin_limit')->default(1)->after('daily_request_limit');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('heygen_usage_daily', function (Blueprint $table): void {
            $table->dropColumn(['digital_twin_requests', 'daily_digital_twin_limit']);
        });
    }
};

