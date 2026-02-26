<?php

namespace App\Services\HeyGen;

use RuntimeException;

class HeyGenQuotaException extends RuntimeException
{
    public function __construct(string $message = 'HeyGen quota exceeded.')
    {
        parent::__construct($message, 429);
    }
}
