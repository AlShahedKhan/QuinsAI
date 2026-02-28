<?php

namespace App\Http\Requests\Api\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Permission;

class UpdatePermissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var Permission|string|null $permission */
        $permission = $this->route('permission');
        $permissionId = $permission instanceof Permission ? $permission->id : null;

        return [
            'name' => [
                'required',
                'string',
                'min:3',
                'max:80',
                'regex:/^[a-z][a-z0-9._-]*$/',
                Rule::unique('permissions', 'name')
                    ->where('guard_name', 'sanctum')
                    ->ignore($permissionId),
            ],
        ];
    }

    protected function prepareForValidation(): void
    {
        $name = $this->input('name');
        if (is_string($name)) {
            $this->merge([
                'name' => mb_strtolower(trim($name)),
            ]);
        }
    }
}

