import { FormEvent, useEffect, useMemo, useState } from 'react';
import { heygenApi } from '../lib/heygenApi';
import { FormNotice } from '../components/ui/FormNotice';
import type { CatalogDto, VideoJobDto } from '../types/heygen';

type Props = {
    onVideoCreated: (video: VideoJobDto) => Promise<void> | void;
};

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

export function VideoGeneratorPage({ onVideoCreated }: Props) {
    const [catalog, setCatalog] = useState<CatalogDto>({ avatars: [], voices: [] });
    const [avatarId, setAvatarId] = useState('');
    const [voiceId, setVoiceId] = useState('');
    const [script, setScript] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [quotaRemaining, setQuotaRemaining] = useState<number | null>(null);

    useEffect(() => {
        let active = true;

        async function loadCatalog() {
            try {
                const data = await heygenApi.getCatalog();
                if (!active) {
                    return;
                }

                setCatalog(data);
                setAvatarId((previous) => previous || (data.avatars[0] ? resolveCatalogItemId(data.avatars[0]) : ''));
                setVoiceId((previous) => previous || (data.voices[0] ? resolveCatalogItemId(data.voices[0]) : ''));
            } catch (err) {
                if (!active) {
                    return;
                }

                const normalized = err instanceof Error ? err : new Error('Unable to load catalog.');
                setError(normalized.message);
            }
        }

        void loadCatalog();

        return () => {
            active = false;
        };
    }, []);

    const scriptLength = script.trim().length;

    const canSubmit = useMemo(
        () => !submitting && avatarId !== '' && voiceId !== '' && scriptLength > 0,
        [submitting, avatarId, voiceId, scriptLength],
    );

    const selectedAvatar = useMemo(() => {
        return catalog.avatars.find((item) => resolveCatalogItemId(item) === avatarId) ?? null;
    }, [catalog.avatars, avatarId]);

    const selectedVoice = useMemo(() => {
        return catalog.voices.find((item) => resolveCatalogItemId(item) === voiceId) ?? null;
    }, [catalog.voices, voiceId]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSubmit) {
            return;
        }

        setSubmitting(true);
        setError(null);
        setMessage(null);

        try {
            const response = await heygenApi.createVideo({
                avatar_id: avatarId,
                voice_id: voiceId,
                script: script.trim(),
            });

            setMessage(`Video job #${response.data.id} is queued for rendering.`);
            setScript('');

            const remaining = response.quota.video_requests_remaining;
            setQuotaRemaining(typeof remaining === 'number' ? remaining : null);

            await onVideoCreated(response.data);
        } catch (err) {
            const normalized = err instanceof Error ? err : new Error('Failed to create video.');
            setError(normalized.message);
        } finally {
            setSubmitting(false);
        }
    }

    const avatarOptionsEmpty = catalog.avatars.length === 0;
    const voiceOptionsEmpty = catalog.voices.length === 0;

    return (
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <article className="surface-card page-enter p-6 sm:p-7">
                <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Async Avatar Video</p>
                        <h2 className="mt-1 text-2xl text-slate-900">Generate a New Video</h2>
                        <p className="mt-2 text-sm text-slate-600">
                            Choose avatar and voice, submit script text, and monitor queued status in history.
                        </p>
                    </div>

                    <span className="status-badge status-default">Webhook + polling enabled</span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label className="field-label" htmlFor="video-avatar">Avatar</label>
                            <select
                                id="video-avatar"
                                className="select-field"
                                value={avatarId}
                                onChange={(event) => setAvatarId(event.target.value)}
                                disabled={avatarOptionsEmpty}
                                required
                            >
                                {avatarOptionsEmpty && <option value="">No avatars available</option>}
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
                            <label className="field-label" htmlFor="video-voice">Voice</label>
                            <select
                                id="video-voice"
                                className="select-field"
                                value={voiceId}
                                onChange={(event) => setVoiceId(event.target.value)}
                                disabled={voiceOptionsEmpty}
                                required
                            >
                                {voiceOptionsEmpty && <option value="">No voices available</option>}
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
                            <label className="field-label !mb-0" htmlFor="video-script">Script</label>
                            <span className="text-xs font-semibold text-slate-500">{scriptLength} characters</span>
                        </div>

                        <textarea
                            id="video-script"
                            className="textarea-field"
                            value={script}
                            onChange={(event) => setScript(event.target.value)}
                            placeholder="Write the spoken script for the avatar. Keep sentences clear and concise for better lip-sync quality."
                            maxLength={1500}
                            required
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button type="submit" disabled={!canSubmit} className="btn-primary">
                            {submitting ? 'Queuing video...' : 'Queue Render'}
                        </button>
                        <p className="text-xs text-slate-500">Generation runs asynchronously. Status updates arrive through webhook events.</p>
                    </div>
                </form>

                <div className="mt-5 space-y-3">
                    {message && <FormNotice tone="success">{message}</FormNotice>}
                    {error && <FormNotice tone="error">{error}</FormNotice>}
                </div>
            </article>

            <aside className="grid gap-6">
                <article className="surface-card page-enter stagger-1 p-6">
                    <h3 className="text-lg text-slate-900">Request Snapshot</h3>
                    <p className="mt-1 text-sm text-slate-600">Current payload selected for submission.</p>

                    <dl className="mt-4 space-y-3 text-sm">
                        <div className="rounded-xl border border-slate-200/90 bg-white/85 px-4 py-3">
                            <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Avatar</dt>
                            <dd className="mt-1 font-semibold text-slate-900">
                                {selectedAvatar ? resolveCatalogItemLabel(selectedAvatar) : 'Not selected'}
                            </dd>
                            <p className="mt-1 font-mono text-xs text-slate-500">{avatarId || 'N/A'}</p>
                        </div>

                        <div className="rounded-xl border border-slate-200/90 bg-white/85 px-4 py-3">
                            <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Voice</dt>
                            <dd className="mt-1 font-semibold text-slate-900">
                                {selectedVoice ? resolveCatalogItemLabel(selectedVoice) : 'Not selected'}
                            </dd>
                            <p className="mt-1 font-mono text-xs text-slate-500">{voiceId || 'N/A'}</p>
                        </div>

                        <div className="rounded-xl border border-slate-200/90 bg-white/85 px-4 py-3">
                            <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Script Length</dt>
                            <dd className="mt-1 font-semibold text-slate-900">{scriptLength} characters</dd>
                        </div>
                    </dl>
                </article>

                <article className="surface-card page-enter stagger-2 p-6">
                    <h3 className="text-lg text-slate-900">Quota</h3>
                    <p className="mt-1 text-sm text-slate-600">Track daily limit consumption after each submission.</p>

                    <div className="mt-4 rounded-2xl border border-slate-200/90 bg-white/85 px-4 py-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Remaining Requests</p>
                        <p className="mt-2 text-3xl font-semibold text-slate-900">
                            {quotaRemaining === null ? 'Unknown' : quotaRemaining}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">Value updates when a new job request is accepted by the API.</p>
                    </div>
                </article>
            </aside>
        </section>
    );
}
