<?php

namespace App\Services\HeyGen;

use Illuminate\Validation\ValidationException;

class HeyGenScriptSafetyService
{
    public function assertAllowed(string $script): void
    {
        $trimmed = trim($script);

        if ($trimmed === '') {
            throw ValidationException::withMessages([
                'script' => 'Script must not be empty.',
            ]);
        }

        $maxChars = (int) config('services.heygen.script_max_chars', 1500);
        if (mb_strlen($trimmed) > $maxChars) {
            throw ValidationException::withMessages([
                'script' => "Script exceeds max length of {$maxChars} characters.",
            ]);
        }

        /** @var list<string> $blocklist */
        $blocklist = (array) config('services.heygen.script_blocklist', []);

        foreach ($blocklist as $term) {
            if ($term === '') {
                continue;
            }

            if (mb_stripos($trimmed, $term) !== false) {
                throw ValidationException::withMessages([
                    'script' => 'Script includes blocked content.',
                ]);
            }
        }
    }
}
