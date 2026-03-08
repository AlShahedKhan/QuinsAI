import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { heygenApi } from '../lib/heygenApi';
import { FormNotice } from '../components/ui/FormNotice';
import type { CatalogDto } from '../types/heygen';

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

export function VideoGeneratorPage() {
    const [searchParams] = useSearchParams();
    const [catalog, setCatalog] = useState<CatalogDto>({ avatars: [], voices: [] });
    const [avatarId, setAvatarId] = useState('');
    const [voiceId, setVoiceId] = useState('');
    const [script, setScript] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const requestedAvatarId = searchParams.get('avatar_id') ?? '';
    const requestedVoiceId = searchParams.get('voice_id') ?? '';

    useEffect(() => {
        let active = true;

        async function loadCatalog() {
            try {
                const data = await heygenApi.getCatalog();
                if (!active) {
                    return;
                }

                setCatalog(data);

                const preferredAvatarId = requestedAvatarId !== '' && data.avatars.some((avatar) => resolveCatalogItemId(avatar) === requestedAvatarId)
                    ? requestedAvatarId
                    : (data.avatars[0] ? resolveCatalogItemId(data.avatars[0]) : '');
                const preferredVoiceId = requestedVoiceId !== '' && data.voices.some((voice) => resolveCatalogItemId(voice) === requestedVoiceId)
                    ? requestedVoiceId
                    : (data.voices[0] ? resolveCatalogItemId(data.voices[0]) : '');

                setAvatarId((previous) => previous || preferredAvatarId);
                setVoiceId((previous) => previous || preferredVoiceId);
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
    }, [requestedAvatarId, requestedVoiceId]);

    const scriptLength = script.trim().length;

    const canSubmit = useMemo(
        () => !submitting && avatarId !== '' && voiceId !== '' && scriptLength > 0,
        [submitting, avatarId, voiceId, scriptLength],
    );

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
        <section className="mx-auto grid w-full max-w-4xl gap-6">
            <article className="surface-card page-enter p-6 sm:p-7">
                <div className="mb-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Async Avatar Video</p>
                    <h2 className="mt-1 text-2xl text-slate-900">Generate a New Video</h2>
                    <p className="mt-2 text-sm text-slate-600">
                        Choose an avatar and voice, write a clear script, and queue the render.
                    </p>
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
                    </div>
                </form>

                <div className="mt-5 space-y-3">
                    {message && <FormNotice tone="success">{message}</FormNotice>}
                    {error && <FormNotice tone="error">{error}</FormNotice>}
                </div>
            </article>
        </section>
    );
}
