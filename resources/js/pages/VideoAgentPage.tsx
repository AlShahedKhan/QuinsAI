import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { FormNotice } from '../components/ui/FormNotice';
import { useVideoPolling } from '../hooks/useVideoPolling';
import { heygenApi } from '../lib/heygenApi';
import type { VideoAgentJobDto } from '../types/heygen';

const VIDEO_AGENT_DOC_URL = 'https://docs.heygen.com/docs/overview-video-agent';
const PROMPT_MAX_CHARS = 5000;

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

function statusClass(status: VideoAgentJobDto['status']): string {
    switch (status) {
        case 'completed':
            return 'status-completed';
        case 'failed':
            return 'status-failed';
        default:
            return 'status-default';
    }
}

export function VideoAgentPage() {
    const [prompt, setPrompt] = useState('');
    const [jobs, setJobs] = useState<VideoAgentJobDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [quotaRemaining, setQuotaRemaining] = useState<number | null>(null);

    const promptLength = prompt.trim().length;

    const loadJobs = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await heygenApi.listVideoAgentVideos();
            setJobs(response.data);
        } catch (err) {
            const normalized = err instanceof Error ? err : new Error('Failed to load Video Agent jobs.');
            setError(normalized.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadJobs();
    }, [loadJobs]);

    useVideoPolling(jobs, loadJobs);

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
            { total: 0, active: 0, completed: 0, failed: 0 },
        );
    }, [jobs]);

    const canSubmit = !submitting && promptLength > 0;

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSubmit) {
            return;
        }

        setSubmitting(true);
        setError(null);
        setMessage(null);

        try {
            const response = await heygenApi.createVideoAgent({
                prompt: prompt.trim(),
            });

            setMessage(`Video Agent job #${response.data.id} is queued.`);
            setPrompt('');

            const remaining = response.quota.video_requests_remaining;
            setQuotaRemaining(typeof remaining === 'number' ? remaining : null);

            await loadJobs();
        } catch (err) {
            const normalized = err instanceof Error ? err : new Error('Failed to create Video Agent job.');
            setError(normalized.message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <article className="surface-card page-enter p-6 sm:p-7">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Prompt To Video</p>
                        <h2 className="mt-1 text-2xl text-slate-900">HeyGen Video Agent</h2>
                        <p className="mt-2 max-w-2xl text-sm text-slate-600">
                            Submit a single prompt and let HeyGen compose the scene, speech, and final render. Jobs run asynchronously and complete through webhook updates with polling fallback.
                        </p>
                    </div>

                    <a className="btn-secondary" href={VIDEO_AGENT_DOC_URL} target="_blank" rel="noreferrer">
                        API Docs
                    </a>
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                    <div>
                        <div className="mb-2 flex items-center justify-between gap-3">
                            <label className="field-label !mb-0" htmlFor="video-agent-prompt">Prompt</label>
                            <span className="text-xs font-semibold text-slate-500">{promptLength} / {PROMPT_MAX_CHARS}</span>
                        </div>

                        <textarea
                            id="video-agent-prompt"
                            className="textarea-field min-h-[15rem]"
                            value={prompt}
                            onChange={(event) => setPrompt(event.target.value)}
                            placeholder="Example: Create a 30-second product launch video for a SaaS dashboard. Use a confident presenter, clean studio background, upbeat pacing, and include a closing call to action for a free trial."
                            maxLength={PROMPT_MAX_CHARS}
                            required
                        />
                        <p className="mt-2 text-xs text-slate-500">
                            Be specific about tone, audience, pacing, visual style, and the final call to action. The backend keeps API keys private and enforces quota and prompt safety checks.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button type="submit" disabled={!canSubmit} className="btn-primary">
                            {submitting ? 'Queuing job...' : 'Generate With Video Agent'}
                        </button>
                        <button type="button" className="btn-secondary" onClick={() => void loadJobs()} disabled={loading || submitting}>
                            {loading ? 'Refreshing...' : 'Refresh Jobs'}
                        </button>
                    </div>
                </form>

                <div className="mt-5 space-y-3">
                    {message && <FormNotice tone="success">{message}</FormNotice>}
                    {error && <FormNotice tone="error">{error}</FormNotice>}
                </div>
            </article>

            <aside className="grid gap-6">
                <article className="surface-card page-enter stagger-1 p-6">
                    <h3 className="text-lg text-slate-900">Queue Snapshot</h3>
                    <p className="mt-1 text-sm text-slate-600">Prompt-to-video jobs using the authenticated backend integration.</p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
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

                    <div className="mt-4 rounded-2xl border border-slate-200/90 bg-white/85 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Remaining Daily Requests</p>
                        <p className="mt-2 text-3xl font-semibold text-slate-900">{quotaRemaining === null ? 'Unknown' : quotaRemaining}</p>
                        <p className="mt-2 text-xs text-slate-500">Video Agent requests share the same daily HeyGen video quota as manual avatar video generation.</p>
                    </div>
                </article>

                <article className="surface-card page-enter stagger-2 p-6">
                    <h3 className="text-lg text-slate-900">Recent Jobs</h3>
                    <p className="mt-1 text-sm text-slate-600">Latest prompt-to-video runs for your account.</p>

                    {loading ? (
                        <div className="mt-4 rounded-xl border border-slate-200/90 bg-slate-50/80 px-4 py-6 text-sm text-slate-600">
                            Loading Video Agent jobs...
                        </div>
                    ) : jobs.length === 0 ? (
                        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-6 text-sm text-slate-600">
                            No Video Agent jobs yet.
                        </div>
                    ) : (
                        <div className="mt-4 space-y-4">
                            {jobs.map((job) => (
                                <article key={job.id} className="rounded-2xl border border-slate-200/90 bg-white/90 p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <p className="text-base font-semibold text-slate-900">Agent Job #{job.id}</p>
                                            <p className="text-xs text-slate-500">Submitted {formatDateTime(job.submitted_at ?? job.created_at)}</p>
                                        </div>

                                        <span className={`status-badge ${statusClass(job.status)}`}>
                                            {job.status}
                                        </span>
                                    </div>

                                    <p className="mt-3 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-700">{job.prompt}</p>

                                    <div className="mt-3 grid gap-2 text-sm text-slate-600">
                                        <p>
                                            Provider Video ID: <span className="font-mono text-xs text-slate-700">{job.provider_video_id ?? 'pending'}</span>
                                        </p>
                                        <p>
                                            Completed: <span className="text-slate-700">{formatDateTime(job.completed_at)}</span>
                                        </p>
                                    </div>

                                    {job.error_message ? (
                                        <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{job.error_message}</p>
                                    ) : null}

                                    {job.output_storage_url ? (
                                        <a
                                            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-sky-700 hover:text-sky-800"
                                            href={job.output_storage_url}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            Open archived video
                                        </a>
                                    ) : null}
                                </article>
                            ))}
                        </div>
                    )}
                </article>
            </aside>
        </section>
    );
}
