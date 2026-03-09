import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FormNotice } from '../components/ui/FormNotice';
import { useVideoPolling } from '../hooks/useVideoPolling';
import { heygenApi } from '../lib/heygenApi';
import type { VideoJobDto, VideoJobStatsDto } from '../types/heygen';

type StatusFilter = 'all' | VideoJobDto['status'];

const SCRIPT_PREVIEW_LIMIT = 180;
const PAGE_SIZE = 12;
const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'queued', label: 'Queued' },
    { value: 'submitting', label: 'Submitting' },
    { value: 'processing', label: 'Processing' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
];

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

function isScriptTruncated(script: string): boolean {
    return script.trim().length > SCRIPT_PREVIEW_LIMIT;
}

function getVisibleScript(script: string, expanded: boolean): string {
    if (expanded || !isScriptTruncated(script)) {
        return script;
    }

    return `${script.slice(0, SCRIPT_PREVIEW_LIMIT).trimEnd()}...`;
}

function buildReusePath(job: VideoJobDto): string {
    const params = new URLSearchParams({
        avatar_id: job.avatar_id,
        voice_id: job.voice_id,
    });

    return `/videos/generate?${params.toString()}`;
}

export function VideoHistoryPage() {
    const [jobs, setJobs] = useState<VideoJobDto[]>([]);
    const [stats, setStats] = useState<VideoJobStatsDto>({
        total: 0,
        active: 0,
        completed: 0,
        failed: 0,
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [expandedScripts, setExpandedScripts] = useState<Record<number, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadJobs = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await heygenApi.listVideos({
                page: currentPage,
                per_page: PAGE_SIZE,
                status: statusFilter === 'all' ? undefined : statusFilter,
            });

            setJobs(response.data);
            setStats(response.meta.stats);
            setCurrentPage(response.current_page);
            setLastPage(Math.max(1, response.last_page));
            setTotal(response.total);
        } catch (err) {
            const normalized = err instanceof Error ? err : new Error('Failed to load video jobs.');
            setError(normalized.message);
        } finally {
            setLoading(false);
        }
    }, [currentPage, statusFilter]);

    useEffect(() => {
        void loadJobs();
    }, [loadJobs]);

    useVideoPolling(jobs, loadJobs);

    useEffect(() => {
        if (currentPage > lastPage) {
            setCurrentPage(lastPage);
        }
    }, [currentPage, lastPage]);

    const pageStart = total === 0 ? 0 : ((currentPage - 1) * PAGE_SIZE) + 1;
    const pageEnd = total === 0 ? 0 : Math.min(currentPage * PAGE_SIZE, total);
    const filterLabel = useMemo(
        () => STATUS_FILTERS.find((item) => item.value === statusFilter)?.label ?? 'All',
        [statusFilter],
    );

    const toggleExpandedScript = useCallback((jobId: number) => {
        setExpandedScripts((current) => ({
            ...current,
            [jobId]: !current[jobId],
        }));
    }, []);

    return (
        <section className="grid gap-6">
            <article className="surface-card page-enter p-6 sm:p-7">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Video History</p>
                        <h2 className="mt-1 text-2xl text-slate-900">Track Your Generated Videos</h2>
                        <p className="mt-2 text-sm text-slate-600">
                            Review queued, processing, completed, and failed jobs with stable pagination and direct access to archived outputs.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            void loadJobs();
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
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Filters</p>
                        <h3 className="mt-1 text-xl text-slate-900">Browse by status</h3>
                        <p className="mt-2 text-sm text-slate-600">
                            Current filter: <span className="font-semibold text-slate-900">{filterLabel}</span>
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {STATUS_FILTERS.map((filter) => (
                            <button
                                key={filter.value}
                                type="button"
                                className={statusFilter === filter.value ? 'btn-primary !min-h-10 !rounded-full !px-4 !py-2 !text-sm' : 'btn-secondary !min-h-10 !rounded-full !px-4 !py-2 !text-sm'}
                                onClick={() => {
                                    setCurrentPage(1);
                                    setStatusFilter(filter.value);
                                }}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>

                {error ? (
                    <div className="mt-5">
                        <FormNotice tone="error">{error}</FormNotice>
                    </div>
                ) : null}

                {loading ? (
                    <div className="mt-6 rounded-2xl border border-slate-200/90 bg-slate-50/80 px-4 py-6 text-sm text-slate-600">
                        Loading video jobs...
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white/70 px-5 py-8 text-center">
                        <p className="text-sm font-semibold text-slate-700">No jobs found for this filter.</p>
                        <p className="mt-1 text-sm text-slate-500">Queue a video from the generator page to start building your history.</p>
                        <div className="mt-4">
                            <Link to="/videos/generate" className="btn-primary">
                                Open Generator
                            </Link>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="mt-5 flex flex-col gap-2 border-b border-slate-200/90 pb-4 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-slate-600">
                                Showing <span className="font-semibold text-slate-900">{pageStart}</span>-
                                <span className="font-semibold text-slate-900">{pageEnd}</span> of{' '}
                                <span className="font-semibold text-slate-900">{total}</span> jobs
                            </p>
                            <p className="text-sm text-slate-500">
                                Sorted by newest first
                            </p>
                        </div>

                        <div className="mt-4 space-y-4">
                            {jobs.map((job) => {
                                const scriptExpanded = expandedScripts[job.id] ?? false;
                                const shouldShowToggle = isScriptTruncated(job.script);

                                return (
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

                                        <div className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-3">
                                            <p>
                                                Avatar: <span className="font-mono text-xs text-slate-700">{job.avatar_id}</span>
                                            </p>
                                            <p>
                                                Voice: <span className="font-mono text-xs text-slate-700">{job.voice_id}</span>
                                            </p>
                                            <p>
                                                Provider ID: <span className="font-mono text-xs text-slate-700">{job.provider_video_id ?? 'pending'}</span>
                                            </p>
                                            <p>
                                                Completed: <span className="text-slate-700">{formatDateTime(job.completed_at)}</span>
                                            </p>
                                            <p>
                                                Failed: <span className="text-slate-700">{formatDateTime(job.failed_at)}</span>
                                            </p>
                                            <p>
                                                Updated: <span className="text-slate-700">{formatDateTime(job.updated_at)}</span>
                                            </p>
                                        </div>

                                        <div className="mt-3 rounded-xl bg-slate-50 px-3 py-3">
                                            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Script</p>
                                            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                                                {getVisibleScript(job.script, scriptExpanded)}
                                            </p>
                                            {shouldShowToggle ? (
                                                <button
                                                    type="button"
                                                    className="mt-3 text-sm font-semibold text-sky-700 hover:text-sky-800"
                                                    onClick={() => toggleExpandedScript(job.id)}
                                                >
                                                    {scriptExpanded ? 'Show less' : 'Show full script'}
                                                </button>
                                            ) : null}
                                        </div>

                                        {job.error_message ? (
                                            <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{job.error_message}</p>
                                        ) : null}

                                        <div className="mt-4 flex flex-wrap items-center gap-3">
                                            <Link to={buildReusePath(job)} className="btn-secondary !min-h-9 !rounded-lg !px-3 !py-1.5 !text-sm">
                                                Use again
                                            </Link>
                                            {job.output_storage_url ? (
                                                <a
                                                    className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700 hover:text-sky-800"
                                                    href={job.output_storage_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    Open archived video
                                                </a>
                                            ) : null}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>

                        {lastPage > 1 ? (
                            <div className="mt-5 flex flex-col gap-3 border-t border-slate-200/90 pt-4 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm text-slate-600">
                                    Page <span className="font-semibold text-slate-900">{currentPage}</span> of{' '}
                                    <span className="font-semibold text-slate-900">{lastPage}</span>
                                </p>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        className="btn-secondary !min-h-9 !rounded-lg !px-3 !py-1.5 !text-sm"
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                                    >
                                        Previous
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-secondary !min-h-9 !rounded-lg !px-3 !py-1.5 !text-sm"
                                        disabled={currentPage === lastPage}
                                        onClick={() => setCurrentPage((page) => Math.min(lastPage, page + 1))}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </>
                )}
            </article>
        </section>
    );
}
