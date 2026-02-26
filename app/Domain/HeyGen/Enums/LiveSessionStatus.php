<?php

namespace App\Domain\HeyGen\Enums;

enum LiveSessionStatus: string
{
    case Created = 'created';
    case Active = 'active';
    case Ended = 'ended';
    case Failed = 'failed';
}
