<?php

namespace App\Http\Requests\Api\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

class UpdateRoleRequest extends FormRequest
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
        /** @var Role|string|null $role */
        $role = $this->route('role');
        $roleId = $role instanceof Role ? $role->id : null;

        return [
            'name' => [
                'required',
                'string',
                'min:3',
                'max:60',
                'regex:/^[a-z][a-z0-9._-]*$/',
                Rule::unique('roles', 'name')
                    ->where('guard_name', 'sanctum')
                    ->ignore($roleId),
            ],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => [
                'required',
                'string',
                'distinct',
                Rule::exists('permissions', 'name')->where('guard_name', 'sanctum'),
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

