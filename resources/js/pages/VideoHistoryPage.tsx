import { useMemo } from 'react';
import { FormNotice } from '../components/ui/FormNotice';
import type { VideoJobDto } from '../types/heygen';

type Props = {
    jobs: VideoJobDto[];
    loading: boolean;
    error: string | null;
    onRefresh: () => Promise<void>;
};

function statusClass(status: VideoJobDto['status']): string {
    switch (status) {
        case 'completed':
            return 'status-completed';
        case 'failed':
            return 'status-failed';
        default:
            return 'status-default';
    }
}

function formatDateTime(value: string | null): string {
    if (!value) {
        return 'N/A';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

export function VideoHistoryPage({ jobs, loading, error, onRefresh }: Props) {
    const stats = useMemo(() => {
        return jobs.reduce(
            (acc, job) => {
                acc.total += 1;

                if (job.status === 'completed') {
                    acc.completed += 1;
                } else if (job.status === 'failed') {
                    acc.failed += 1;
                } else {
                    acc.active += 1;
                }

                return acc;
            },
            { total: 0, completed: 0, failed: 0, active: 0 },
        );
    }, [jobs]);

    return (
        <section className="grid gap-6">
            <article className="surface-card page-enter p-6 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Async Pipeline Monitor</p>
                        <h2 className="mt-1 text-2xl text-slate-900">Video History</h2>
                        <p className="mt-2 text-sm text-slate-600">Observe state transitions and open archived outputs from completed jobs.</p>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            void onRefresh();
                        }}
                        className="btn-secondary"
                    >
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-slate-200/90 bg-white/85 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Total Jobs</p>
                        <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.total}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200/90 bg-white/85 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">In Progress</p>
                        <p className="mt-1 text-2xl font-semibold text-amber-700">{stats.active}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200/90 bg-white/85 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Completed</p>
                        <p className="mt-1 text-2xl font-semibold text-emerald-700">{stats.completed}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200/90 bg-white/85 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Failed</p>
                        <p className="mt-1 text-2xl font-semibold text-rose-700">{stats.failed}</p>
                    </div>
                </div>
            </article>

            <article className="surface-card page-enter stagger-1 p-6 sm:p-7">
                {error && <FormNotice tone="error">{error}</FormNotice>}

                {loading && (
                    <div className="mt-4 space-y-3">
                        <p className="text-sm text-slate-600">Loading video jobs...</p>
                    </div>
                )}

                {!loading && jobs.length === 0 && (
                    <div className="mt-2 rounded-xl border border-dashed border-slate-300 bg-white/70 px-5 py-8 text-center">
                        <p className="text-sm font-semibold text-slate-700">No jobs yet.</p>
                        <p className="mt-1 text-sm text-slate-500">Create your first video from the generator tab to start tracking history.</p>
                    </div>
                )}

                <div className="mt-4 space-y-4">
                    {jobs.map((job) => (
                        <article key={job.id} className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 sm:p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-base font-semibold text-slate-900">Job #{job.id}</p>
                                    <p className="text-xs text-slate-500">Submitted {formatDateTime(job.submitted_at ?? job.created_at)}</p>
                                </div>

                                <span className={`status-badge ${statusClass(job.status)}`}>
                                    {job.status}
                                </span>
                            </div>

                            <div className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                                <p>
                                    Avatar: <span className="font-mono text-xs text-slate-700">{job.avatar_id}</span>
                                </p>
                                <p>
                                    Voice: <span className="font-mono text-xs text-slate-700">{job.voice_id}</span>
                                </p>
                                <p>
                                    Completed: <span className="text-slate-700">{formatDateTime(job.completed_at)}</span>
                                </p>
                                <p>
                                    Failed: <span className="text-slate-700">{formatDateTime(job.failed_at)}</span>
                                </p>
                            </div>

                            <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">{job.script}</p>

                            {job.error_message && (
                                <p className="mt-3 text-sm font-medium text-rose-700">{job.error_message}</p>
                            )}

                            {job.output_storage_url && (
                                <a
                                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-sky-700 hover:text-sky-800"
                                    href={job.output_storage_url}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Open archived video
                                </a>
                            )}
                        </article>
                    ))}
                </div>
            </article>
        </section>
    );
}
