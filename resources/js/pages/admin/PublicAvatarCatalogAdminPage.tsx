import { useEffect, useState } from 'react';
import { FormNotice } from '../../components/ui/FormNotice';
import { adminApi } from '../../lib/adminApi';
import type { PublicAvatarCatalogStatsDto } from '../../types/heygen';

function formatDateTime(value: string | null): string {
    if (!value) {
        return 'N/A';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return 'N/A';
    }

    return date.toLocaleString();
}

export function PublicAvatarCatalogAdminPage() {
    const [stats, setStats] = useState<PublicAvatarCatalogStatsDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function loadStats() {
        setLoading(true);
        setError(null);

        try {
            const payload = await adminApi.getPublicAvatarCatalogStats();
            setStats(payload);
        } catch (err) {
            const normalized = err instanceof Error ? err : new Error('Failed to load public avatar catalog stats.');
            setError(normalized.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadStats();
    }, []);

    async function handleSync() {
        const confirmed = window.confirm('Run a full public avatar sync now? This may take a while on a slow network.');
        if (!confirmed) {
            return;
        }

        setSyncing(true);
        setError(null);
        setMessage(null);

        try {
            const response = await adminApi.syncPublicAvatarCatalog();
            setStats(response.data);
            setMessage(`${response.message} Synced ${response.summary.synced ?? 0} avatars.`);
        } catch (err) {
            const normalized = err instanceof Error ? err : new Error('Failed to sync public avatar catalog.');
            setError(normalized.message);
        } finally {
            setSyncing(false);
        }
    }

    return (
        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <article className="surface-card page-enter p-6 sm:p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">HeyGen Admin</p>
                <h2 className="mt-1 text-2xl text-slate-900">Public Avatar Catalog</h2>
                <p className="mt-2 text-sm text-slate-600">
                    Monitor the local public-avatar mirror, trigger manual syncs, and verify what the current provider API exposes.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                    <button type="button" className="btn-primary" onClick={() => void handleSync()} disabled={syncing}>
                        {syncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => void loadStats()} disabled={loading || syncing}>
                        {loading ? 'Refreshing...' : 'Refresh Stats'}
                    </button>
                </div>

                <div className="mt-5 space-y-3">
                    {message && <FormNotice tone="success">{message}</FormNotice>}
                    {error && <FormNotice tone="error">{error}</FormNotice>}
                    {stats && <FormNotice tone="info">{stats.looks_support.note}</FormNotice>}
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200/90 bg-white/85 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Last Sync</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{formatDateTime(stats?.last_synced_at ?? null)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/90 bg-white/85 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Latest Avatar ID</p>
                        <p className="mt-2 font-mono text-xs text-slate-700">{stats?.latest_avatar_id ?? 'N/A'}</p>
                    </div>
                </div>
            </article>

            <article className="surface-card page-enter stagger-1 p-6 sm:p-7">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Active Avatars</p>
                        <p className="mt-2 text-3xl font-semibold text-slate-900">{stats?.active ?? 'N/A'}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Inactive Avatars</p>
                        <p className="mt-2 text-3xl font-semibold text-slate-900">{stats?.inactive ?? 'N/A'}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Preview Videos</p>
                        <p className="mt-2 text-3xl font-semibold text-slate-900">{stats?.preview_video_count ?? 'N/A'}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Categories</p>
                        <p className="mt-2 text-3xl font-semibold text-slate-900">{stats?.categories_count ?? 'N/A'}</p>
                    </div>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200/90 bg-slate-50/80 px-4 py-4 text-sm text-slate-600">
                    <p>
                        Total rows in the local catalog: <span className="font-semibold text-slate-900">{stats?.total ?? 'N/A'}</span>
                    </p>
                    <p className="mt-2">
                        Public-avatar API exposes multiple looks: <span className="font-semibold text-slate-900">{stats?.looks_support.public_avatar_api_exposes_looks ? 'Yes' : 'No'}</span>
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                        The gallery stays fast because normal page loads read from your database. Only manual sync and details refresh touch HeyGen directly.
                    </p>
                </div>
            </article>
        </section>
    );
}
