<?php

namespace App\Domain\HeyGen\Enums;

enum VideoJobStatus: string
{
    case Queued = 'queued';
    case Submitting = 'submitting';
    case Processing = 'processing';
    case Completed = 'completed';
    case Failed = 'failed';

    public function isTerminal(): bool
    {
        return $this === self::Completed || $this === self::Failed;
    }
}
