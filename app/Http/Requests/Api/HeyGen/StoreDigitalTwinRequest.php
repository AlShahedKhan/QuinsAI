<?php

namespace App\Http\Requests\Api\HeyGen;

use Illuminate\Foundation\Http\FormRequest;

class StoreDigitalTwinRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $maxKb = (int) config('services.heygen.digital_twin_max_upload_mb', 250) * 1024;

        return [
            'avatar_name' => ['required', 'string', 'max:120'],
            'training_footage' => ['required', 'file', 'mimes:mp4', 'mimetypes:video/mp4', "max:{$maxKb}"],
            'video_consent' => ['required', 'file', 'mimes:mp4', 'mimetypes:video/mp4', "max:{$maxKb}"],
        ];
    }
}

