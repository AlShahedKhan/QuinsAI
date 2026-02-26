<?php

namespace App\Services\HeyGen;

use RuntimeException;

class HeyGenException extends RuntimeException
{
    /**
     * @param  array<string, mixed>|null  $context
     */
    public function __construct(
        string $message,
        public readonly int $statusCode = 500,
        public readonly ?array $context = null,
    ) {
        parent::__construct($message, $statusCode);
    }
}
