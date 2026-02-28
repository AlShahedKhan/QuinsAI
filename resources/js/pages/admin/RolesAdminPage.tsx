import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth, hasPermission } from '../../auth/AuthContext';
import { FormNotice } from '../../components/ui/FormNotice';
import { adminApi } from '../../lib/adminApi';
import type { PermissionDto, RoleDto } from '../../types/heygen';

export function RolesAdminPage() {
    const { state } = useAuth();
    const user = state.user;

    const canCreate = hasPermission(user, 'roles.create');
    const canUpdate = hasPermission(user, 'roles.update');
    const canDelete = hasPermission(user, 'roles.delete');

    const [roles, setRoles] = useState<RoleDto[]>([]);
    const [permissions, setPermissions] = useState<PermissionDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [editRoleId, setEditRoleId] = useState<number | null>(null);
    const [name, setName] = useState('');
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

    const isEditMode = editRoleId !== null;

    async function loadData() {
        setLoading(true);
        setError(null);

        try {
            const [roleList, permissionList] = await Promise.all([
                adminApi.listRoles(),
                adminApi.listPermissions(),
            ]);

            setRoles(roleList);
            setPermissions(permissionList);
        } catch (err) {
            const normalized = err instanceof Error ? err : new Error('Failed to load roles and permissions.');
            setError(normalized.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadData();
    }, []);

    function resetForm() {
        setEditRoleId(null);
        setName('');
        setSelectedPermissions([]);
    }

    function togglePermission(permissionName: string) {
        setSelectedPermissions((prev) => (
            prev.includes(permissionName)
                ? prev.filter((item) => item !== permissionName)
                : [...prev, permissionName].sort()
        ));
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!name.trim()) {
            return;
        }

        const canSubmit = isEditMode ? canUpdate : canCreate;
        if (!canSubmit) {
            setError('You do not have permission to perform this action.');
            return;
        }

        setSubmitting(true);
        setError(null);
        setMessage(null);

        try {
            if (isEditMode) {
                await adminApi.updateRole(editRoleId, {
                    name: name.trim(),
                    permissions: selectedPermissions,
                });
                setMessage('Role updated successfully.');
            } else {
                await adminApi.createRole({
                    name: name.trim(),
                    permissions: selectedPermissions,
                });
                setMessage('Role created successfully.');
            }

            resetForm();
            await loadData();
        } catch (err) {
            const normalized = err instanceof Error ? err : new Error('Failed to save role.');
            setError(normalized.message);
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(role: RoleDto) {
        if (!canDelete) {
            setError('You do not have permission to delete roles.');
            return;
        }

        const confirmed = window.confirm(`Delete role "${role.name}"? This cannot be undone.`);
        if (!confirmed) {
            return;
        }

        setError(null);
        setMessage(null);

        try {
            await adminApi.deleteRole(role.id);
            setMessage('Role deleted successfully.');
            if (editRoleId === role.id) {
                resetForm();
            }
            await loadData();
        } catch (err) {
            const normalized = err instanceof Error ? err : new Error('Failed to delete role.');
            setError(normalized.message);
        }
    }

    function startEdit(role: RoleDto) {
        if (!canUpdate) {
            setError('You do not have permission to edit roles.');
            return;
        }

        if (role.name === 'super-admin') {
            setError('The super-admin role is immutable.');
            return;
        }

        setEditRoleId(role.id);
        setName(role.name);
        setSelectedPermissions([...role.permissions]);
        setMessage(null);
        setError(null);
    }

    const permissionNames = useMemo(
        () => permissions.map((permission) => permission.name).sort(),
        [permissions],
    );

    return (
        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <article className="surface-card page-enter p-6 sm:p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Admin Security</p>
                <h2 className="mt-1 text-2xl text-slate-900">Role Management</h2>
                <p className="mt-2 text-sm text-slate-600">Create and maintain RBAC roles for secure backend access.</p>

                <form onSubmit={handleSubmit} className="mt-5 space-y-5">
                    <div>
                        <label className="field-label" htmlFor="role-name">Role Name</label>
                        <input
                            id="role-name"
                            type="text"
                            className="text-field"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder="e.g. support-manager"
                            disabled={submitting || (isEditMode ? !canUpdate : !canCreate)}
                            required
                        />
                    </div>

                    <div>
                        <p className="field-label !mb-2">Permissions</p>
                        <div className="grid max-h-72 gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3">
                            {permissionNames.length === 0 && (
                                <p className="text-sm text-slate-500">No permissions found.</p>
                            )}

                            {permissionNames.map((permissionName) => (
                                <label key={permissionName} className="flex items-center gap-2 text-sm text-slate-700">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-slate-300 text-slate-900"
                                        checked={selectedPermissions.includes(permissionName)}
                                        onChange={() => togglePermission(permissionName)}
                                        disabled={submitting || (isEditMode ? !canUpdate : !canCreate)}
                                    />
                                    <span className="font-mono text-xs">{permissionName}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={submitting || (isEditMode ? !canUpdate : !canCreate)}
                        >
                            {submitting ? 'Saving...' : isEditMode ? 'Update Role' : 'Create Role'}
                        </button>

                        <button type="button" className="btn-secondary" onClick={resetForm} disabled={submitting}>
                            Reset
                        </button>
                    </div>
                </form>

                <div className="mt-5 space-y-3">
                    {message && <FormNotice tone="success">{message}</FormNotice>}
                    {error && <FormNotice tone="error">{error}</FormNotice>}
                </div>
            </article>

            <article className="surface-card page-enter stagger-1 p-6 sm:p-7">
                <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl text-slate-900">Existing Roles</h3>
                    <button type="button" className="btn-secondary" onClick={() => void loadData()} disabled={loading}>
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>

                <div className="mt-4 space-y-3">
                    {roles.map((role) => (
                        <article key={role.id} className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-slate-900">
                                    {role.name}
                                    {role.name === 'super-admin' && (
                                        <span className="ml-2 status-badge status-default">Protected</span>
                                    )}
                                </p>
                                <p className="text-xs text-slate-500">Users: {role.users_count}</p>
                            </div>

                            <p className="mt-2 text-xs text-slate-500">
                                Permissions: {role.permissions.length > 0 ? role.permissions.join(', ') : 'None'}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => startEdit(role)}
                                    disabled={!canUpdate || role.name === 'super-admin'}
                                >
                                    Edit
                                </button>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => {
                                        void handleDelete(role);
                                    }}
                                    disabled={!canDelete || role.name === 'super-admin'}
                                >
                                    Delete
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            </article>
        </section>
    );
}

