<?php

namespace App\Http\Requests\Api\HeyGen;

use Illuminate\Foundation\Http\FormRequest;

class StoreVideoAgentRequest extends FormRequest
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
            'prompt' => ['required', 'string', 'max:'.(int) config('services.heygen.video_agent_prompt_max_chars', 5000)],
        ];
    }
}
