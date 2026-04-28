import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FormNotice } from '../components/ui/FormNotice';
import { heygenApi } from '../lib/heygenApi';
import type { HeyGenQuotaDto } from '../types/heygen';

function formatNumber(value: number): string {
    return new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 2,
    }).format(value);
}

function formatDateTime(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

function formatDetailLabel(value: string): string {
    return value
        .split('_')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

export function CreditsPage() {
    const [quota, setQuota] = useState<HeyGenQuotaDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const details = useMemo(() => (
        Object.entries(quota?.details ?? {})
            .filter(([, value]) => Number.isFinite(Number(value)))
            .sort(([a], [b]) => a.localeCompare(b))
    ), [quota]);

    const loadQuota = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await heygenApi.getQuota();
            setQuota(response);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not check HeyGen credits.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadQuota();
    }, [loadQuota]);

    return (
        <div className="space-y-6">
            <article className="surface-card page-enter p-6 sm:p-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">HeyGen API Credits</p>
                        <h2 className="mt-2 text-2xl font-semibold text-slate-950">Credit balance</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                            This checks the Direct API quota attached to the configured HeyGen API key.
                        </p>
                    </div>

                    <button type="button" className="btn-secondary" onClick={() => void loadQuota()} disabled={loading}>
                        {loading ? 'Checking...' : 'Refresh'}
                    </button>
                </div>

                {error ? (
                    <div className="mt-5">
                        <FormNotice tone="error">{error}</FormNotice>
                    </div>
                ) : null}

                <div className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-stretch">
                    <div className="rounded-2xl border border-slate-200 bg-white/80 p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Remaining</p>
                        <p className={`mt-3 text-5xl font-semibold ${quota?.is_empty ? 'text-rose-700' : 'text-emerald-700'}`}>
                            {quota ? formatNumber(quota.remaining_quota) : '--'}
                        </p>
                        <p className="mt-3 text-sm text-slate-600">
                            {quota
                                ? (quota.is_empty ? 'API credits are finished. Add HeyGen API credits before generating another video.' : 'API credits are available for generation.')
                                : 'Fetching the current HeyGen API quota.'}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 sm:min-w-56">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Status</p>
                        <span className={`mt-3 status-badge ${quota?.is_empty ? 'status-failed' : 'status-completed'}`}>
                            {quota ? (quota.is_empty ? 'Empty' : 'Available') : 'Checking'}
                        </span>
                        <p className="mt-4 text-sm text-slate-600">
                            Last checked: <span className="font-semibold text-slate-800">{quota ? formatDateTime(quota.checked_at) : 'N/A'}</span>
                        </p>
                    </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                    <Link to="/videos/generate" className="btn-primary">
                        Generate video
                    </Link>
                    <Link to="/videos" className="btn-secondary">
                        View history
                    </Link>
                </div>
            </article>

            <article className="surface-card page-enter stagger-1 p-6 sm:p-7">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-950">Included free credit buckets</h3>
                        <p className="mt-1 text-sm text-slate-600">
                            HeyGen may report separate balances for specific tools and free allowances.
                        </p>
                    </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {details.length > 0 ? details.map(([name, value]) => (
                        <div key={name} className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3">
                            <p className="text-sm font-semibold text-slate-800">{formatDetailLabel(name)}</p>
                            <p className="mt-1 text-2xl font-semibold text-slate-950">{formatNumber(Number(value))}</p>
                        </div>
                    )) : (
                        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600 sm:col-span-2 xl:col-span-3">
                            {loading ? 'Loading credit details...' : 'No extra credit buckets were returned by HeyGen.'}
                        </p>
                    )}
                </div>
            </article>
        </div>
    );
}
