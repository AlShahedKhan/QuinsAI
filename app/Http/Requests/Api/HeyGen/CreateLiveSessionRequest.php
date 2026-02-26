<?php

namespace App\Http\Requests\Api\HeyGen;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateLiveSessionRequest extends FormRequest
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
            'quality' => ['nullable', 'string', Rule::in(['low', 'medium', 'high'])],
        ];
    }
}
