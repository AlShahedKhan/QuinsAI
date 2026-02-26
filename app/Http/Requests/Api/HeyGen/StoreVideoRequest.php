<?php

namespace App\Http\Requests\Api\HeyGen;

use Illuminate\Foundation\Http\FormRequest;

class StoreVideoRequest extends FormRequest
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
        return [
            'avatar_id' => ['required', 'string', 'max:255'],
            'voice_id' => ['required', 'string', 'max:255'],
            'script' => ['required', 'string', 'max:'.(int) config('services.heygen.script_max_chars', 1500)],
        ];
    }
}
