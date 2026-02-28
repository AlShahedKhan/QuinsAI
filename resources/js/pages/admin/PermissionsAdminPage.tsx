import { FormEvent, useEffect, useState } from 'react';
import { useAuth, hasPermission } from '../../auth/AuthContext';
import { FormNotice } from '../../components/ui/FormNotice';
import { adminApi } from '../../lib/adminApi';
import type { PermissionDto } from '../../types/heygen';

const PROTECTED_PERMISSIONS = new Set([
    'roles.view',
    'roles.create',
    'roles.update',
    'roles.delete',
    'permissions.view',
    'permissions.create',
    'permissions.update',
    'permissions.delete',
]);

export function PermissionsAdminPage() {
    const { state } = useAuth();
    const user = state.user;

    const canCreate = hasPermission(user, 'permissions.create');
    const canUpdate = hasPermission(user, 'permissions.update');
    const canDelete = hasPermission(user, 'permissions.delete');

    const [permissions, setPermissions] = useState<PermissionDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [editPermissionId, setEditPermissionId] = useState<number | null>(null);
    const [name, setName] = useState('');

    const isEditMode = editPermissionId !== null;

    async function loadData() {
        setLoading(true);
        setError(null);

        try {
            const list = await adminApi.listPermissions();
            setPermissions(list);
        } catch (err) {
            const normalized = err instanceof Error ? err : new Error('Failed to load permissions.');
            setError(normalized.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadData();
    }, []);

    function resetForm() {
        setEditPermissionId(null);
        setName('');
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
                await adminApi.updatePermission(editPermissionId, { name: name.trim() });
                setMessage('Permission updated successfully.');
            } else {
                await adminApi.createPermission({ name: name.trim() });
                setMessage('Permission created successfully.');
            }

            resetForm();
            await loadData();
        } catch (err) {
            const normalized = err instanceof Error ? err : new Error('Failed to save permission.');
            setError(normalized.message);
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(permission: PermissionDto) {
        if (!canDelete) {
            setError('You do not have permission to delete permissions.');
            return;
        }

        const confirmed = window.confirm(`Delete permission "${permission.name}"?`);
        if (!confirmed) {
            return;
        }

        setError(null);
        setMessage(null);

        try {
            await adminApi.deletePermission(permission.id);
            setMessage('Permission deleted successfully.');
            if (editPermissionId === permission.id) {
                resetForm();
            }
            await loadData();
        } catch (err) {
            const normalized = err instanceof Error ? err : new Error('Failed to delete permission.');
            setError(normalized.message);
        }
    }

    function startEdit(permission: PermissionDto) {
        if (!canUpdate) {
            setError('You do not have permission to edit permissions.');
            return;
        }

        if (PROTECTED_PERMISSIONS.has(permission.name)) {
            setError('System permissions are immutable.');
            return;
        }

        setEditPermissionId(permission.id);
        setName(permission.name);
        setMessage(null);
        setError(null);
    }

    return (
        <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <article className="surface-card page-enter p-6 sm:p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Admin Security</p>
                <h2 className="mt-1 text-2xl text-slate-900">Permission Management</h2>
                <p className="mt-2 text-sm text-slate-600">Manage granular capability keys consumed by API middleware.</p>

                <form onSubmit={handleSubmit} className="mt-5 space-y-5">
                    <div>
                        <label className="field-label" htmlFor="permission-name">Permission Name</label>
                        <input
                            id="permission-name"
                            type="text"
                            className="text-field"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder="e.g. reports.view"
                            disabled={submitting || (isEditMode ? !canUpdate : !canCreate)}
                            required
                        />
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={submitting || (isEditMode ? !canUpdate : !canCreate)}
                        >
                            {submitting ? 'Saving...' : isEditMode ? 'Update Permission' : 'Create Permission'}
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
                    <h3 className="text-xl text-slate-900">Existing Permissions</h3>
                    <button type="button" className="btn-secondary" onClick={() => void loadData()} disabled={loading}>
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>

                <div className="mt-4 space-y-3">
                    {permissions.map((permission) => {
                        const isProtected = PROTECTED_PERMISSIONS.has(permission.name);

                        return (
                            <article key={permission.id} className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-mono text-xs text-slate-900">{permission.name}</p>
                                    <div className="flex items-center gap-2">
                                        {isProtected && <span className="status-badge status-default">Protected</span>}
                                        <span className="text-xs text-slate-500">Roles: {permission.roles_count}</span>
                                    </div>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={() => startEdit(permission)}
                                        disabled={!canUpdate || isProtected}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={() => {
                                            void handleDelete(permission);
                                        }}
                                        disabled={!canDelete || isProtected}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </article>
        </section>
    );
}

