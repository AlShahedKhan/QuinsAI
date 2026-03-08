<?php

namespace App\Services\HeyGen;

use Illuminate\Validation\ValidationException;

class HeyGenScriptSafetyService
{
    public function assertAllowed(string $script): void
    {
        $this->assertAllowedText(
            value: $script,
            field: 'script',
            maxChars: (int) config('services.heygen.script_max_chars', 1500),
            blocklist: (array) config('services.heygen.script_blocklist', []),
        );
    }

    public function assertAllowedPrompt(string $prompt): void
    {
        $this->assertAllowedText(
            value: $prompt,
            field: 'prompt',
            maxChars: (int) config('services.heygen.video_agent_prompt_max_chars', 5000),
            blocklist: (array) config('services.heygen.video_agent_prompt_blocklist', []),
        );
    }

    /**
     * @param  list<string>  $blocklist
     */
    private function assertAllowedText(string $value, string $field, int $maxChars, array $blocklist): void
    {
        $trimmed = trim($value);

        if ($trimmed === '') {
            throw ValidationException::withMessages([
                $field => ucfirst($field).' must not be empty.',
            ]);
        }

        if (mb_strlen($trimmed) > $maxChars) {
            throw ValidationException::withMessages([
                $field => ucfirst($field)." exceeds max length of {$maxChars} characters.",
            ]);
        }

        foreach ($blocklist as $term) {
            if ($term === '') {
                continue;
            }

            if (mb_stripos($trimmed, $term) !== false) {
                throw ValidationException::withMessages([
                    $field => ucfirst($field).' includes blocked content.',
                ]);
            }
        }
    }
}
