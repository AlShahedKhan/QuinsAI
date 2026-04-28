import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FormNotice } from '../components/ui/FormNotice';
import { useVideoPolling } from '../hooks/useVideoPolling';
import { heygenApi } from '../lib/heygenApi';
import type { CatalogDto, HeyGenQuotaDto, VideoAgentJobDto } from '../types/heygen';

const PROMPT_MAX_CHARS = 5000;

function resolveCatalogItemId(item: Record<string, unknown>): string {
    const candidates = [item.avatar_id, item.voice_id, item.id, item.name];

    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim() !== '') {
            return candidate;
        }
    }

    return '';
}

function resolveCatalogItemLabel(item: Record<string, unknown>): string {
    const labelCandidates = [item.display_name, item.name, item.avatar_id, item.voice_id, item.id];

    for (const candidate of labelCandidates) {
        if (typeof candidate === 'string' && candidate.trim() !== '') {
            return candidate;
        }
    }

    return 'Unnamed';
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

function hasVideoAgentCredit(quota: HeyGenQuotaDto | null): boolean {
    if (!quota) {
        return false;
    }

    return quota.remaining_quota > 0;
}

export function FreeVideoAgentPage() {
    const [prompt, setPrompt] = useState('');
    const [catalog, setCatalog] = useState<CatalogDto>({ avatars: [], voices: [] });
    const [avatarId, setAvatarId] = useState('');
    const [voiceId, setVoiceId] = useState('');
    const [jobs, setJobs] = useState<VideoAgentJobDto[]>([]);
    const [quota, setQuota] = useState<HeyGenQuotaDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const promptLength = prompt.trim().length;
    const videoAgentFreeCredits = Number(quota?.details.video_agent_v2_free_video ?? 0);
    const canSubmit = !submitting && promptLength > 0 && hasVideoAgentCredit(quota);

    const stats = useMemo(() => jobs.reduce(
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
    ), [jobs]);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const [jobsResponse, quotaResponse] = await Promise.all([
                heygenApi.listUserVideoAgentVideos(),
                heygenApi.getQuota(),
            ]);
            setJobs(jobsResponse.data);
            setQuota(quotaResponse);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load Video Agent data.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let active = true;

        async function loadCatalog() {
            try {
                const data = await heygenApi.getCatalog();
                if (!active) {
                    return;
                }

                setCatalog(data);
            } catch (err) {
                if (active) {
                    setError(err instanceof Error ? err.message : 'Unable to load avatars and voices.');
                }
            }
        }

        void loadCatalog();

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    useVideoPolling(jobs, loadData);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSubmit) {
            return;
        }

        setSubmitting(true);
        setError(null);
        setMessage(null);

        try {
            const response = await heygenApi.createUserVideoAgent({
                prompt: prompt.trim(),
                avatar_id: avatarId || null,
                voice_id: voiceId || null,
            });

            setPrompt('');
            setMessage(`Video Agent job #${response.data.id} is queued.`);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create Video Agent job.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <article className="surface-card page-enter p-6 sm:p-7">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Free Video Agent</p>
                        <h2 className="mt-1 text-2xl text-slate-900">Generate with Video Agent</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                            Use HeyGen Video Agent with avatar and voice selection. HeyGen currently requires at least 0.5 main API credits for this API call.
                        </p>
                    </div>

                    <Link to="/credits" className="btn-secondary">
                        View Credits
                    </Link>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200/90 bg-white/85 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Video Agent Free Credits</p>
                        <p className="mt-1 text-3xl font-semibold text-slate-900">{quota ? videoAgentFreeCredits : '--'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200/90 bg-white/85 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Main API Credits</p>
                        <p className="mt-1 text-3xl font-semibold text-slate-900">{quota ? quota.remaining_quota : '--'}</p>
                    </div>
                </div>

                {quota && !hasVideoAgentCredit(quota) ? (
                    <div className="mt-5">
                        <FormNotice tone="error">HeyGen requires at least 0.5 main API credits for Video Agent generation. The free Video Agent bucket is not accepted by this API call.</FormNotice>
                    </div>
                ) : null}

                <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label className="field-label" htmlFor="free-agent-avatar">Avatar</label>
                            <select
                                id="free-agent-avatar"
                                className="select-field"
                                value={avatarId}
                                onChange={(event) => setAvatarId(event.target.value)}
                            >
                                <option value="">Auto Avatar</option>
                                {catalog.avatars.map((avatar, index) => {
                                    const id = resolveCatalogItemId(avatar);

                                    return (
                                        <option key={id || `avatar-${index}`} value={id}>
                                            {resolveCatalogItemLabel(avatar)}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        <div>
                            <label className="field-label" htmlFor="free-agent-voice">Voice</label>
                            <select
                                id="free-agent-voice"
                                className="select-field"
                                value={voiceId}
                                onChange={(event) => setVoiceId(event.target.value)}
                            >
                                <option value="">Auto Voice</option>
                                {catalog.voices.map((voice, index) => {
                                    const id = resolveCatalogItemId(voice);

                                    return (
                                        <option key={id || `voice-${index}`} value={id}>
                                            {resolveCatalogItemLabel(voice)}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    </div>

                    <div>
                        <div className="mb-2 flex items-center justify-between gap-3">
                            <label className="field-label !mb-0" htmlFor="free-video-agent-prompt">Prompt</label>
                            <span className="text-xs font-semibold text-slate-500">{promptLength} / {PROMPT_MAX_CHARS}</span>
                        </div>

                        <textarea
                            id="free-video-agent-prompt"
                            className="textarea-field min-h-[16rem]"
                            value={prompt}
                            onChange={(event) => setPrompt(event.target.value)}
                            placeholder="Example: Create a 30-second intro video for QuinsAI. Use a confident presenter, modern product visuals, friendly pacing, and end with a clear invitation to try the app."
                            maxLength={PROMPT_MAX_CHARS}
                            required
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button type="submit" disabled={!canSubmit} className="btn-primary">
                            {submitting ? 'Queuing...' : 'Generate Free Agent Video'}
                        </button>
                        <button type="button" className="btn-secondary" onClick={() => void loadData()} disabled={loading || submitting}>
                            {loading ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </div>
                </form>

                <div className="mt-5 space-y-3">
                    {message ? <FormNotice tone="success">{message}</FormNotice> : null}
                    {error ? <FormNotice tone="error">{error}</FormNotice> : null}
                </div>
            </article>

            <aside className="grid gap-6">
                <article className="surface-card page-enter stagger-1 p-6">
                    <h3 className="text-lg text-slate-900">Agent Queue</h3>
                    <p className="mt-1 text-sm text-slate-600">Your recent Video Agent jobs.</p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-slate-200/90 bg-white/85 px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Total</p>
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

                <article className="surface-card page-enter stagger-2 p-6">
                    <h3 className="text-lg text-slate-900">Recent Agent Videos</h3>

                    {loading ? (
                        <div className="mt-4 rounded-xl border border-slate-200/90 bg-slate-50/80 px-4 py-6 text-sm text-slate-600">
                            Loading jobs...
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
                                        <span className={`status-badge ${statusClass(job.status)}`}>{job.status}</span>
                                    </div>

                                    <p className="mt-3 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-700">{job.prompt}</p>

                                    {job.error_message ? (
                                        <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{job.error_message}</p>
                                    ) : null}

                                    <div className="mt-3 grid gap-2 text-sm text-slate-600">
                                        <p>
                                            Avatar: <span className="font-mono text-xs text-slate-700">{job.avatar_id ?? 'auto'}</span>
                                        </p>
                                        <p>
                                            Voice: <span className="font-mono text-xs text-slate-700">{job.voice_id ?? 'auto'}</span>
                                        </p>
                                    </div>

                                    {job.output_storage_url ? (
                                        <a className="mt-4 inline-flex text-sm font-semibold text-sky-700 hover:text-sky-800" href={job.output_storage_url} target="_blank" rel="noreferrer">
                                            Open archived video
                                        </a>
                                    ) : job.output_provider_url ? (
                                        <a className="mt-4 inline-flex text-sm font-semibold text-sky-700 hover:text-sky-800" href={job.output_provider_url} target="_blank" rel="noreferrer">
                                            Open provider video
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
