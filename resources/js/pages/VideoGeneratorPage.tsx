import { FormEvent, useEffect, useMemo, useState } from 'react';
import { heygenApi } from '../lib/heygenApi';
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
        let mounted = true;

        heygenApi.getCatalog()
            .then((data) => {
                if (!mounted) return;

                setCatalog(data);
                if (!avatarId && data.avatars[0]) {
                    setAvatarId(resolveCatalogItemId(data.avatars[0]));
                }
                if (!voiceId && data.voices[0]) {
                    setVoiceId(resolveCatalogItemId(data.voices[0]));
                }
            })
            .catch((err: Error) => {
                if (!mounted) return;
                setError(err.message);
            });

        return () => {
            mounted = false;
        };
    }, [avatarId, voiceId]);

    const canSubmit = useMemo(
        () => !submitting && avatarId !== '' && voiceId !== '' && script.trim().length > 0,
        [submitting, avatarId, voiceId, script],
    );

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSubmit) return;

        setSubmitting(true);
        setError(null);
        setMessage(null);

        try {
            const response = await heygenApi.createVideo({
                avatar_id: avatarId,
                voice_id: voiceId,
                script: script.trim(),
            });

            setMessage(`Video job #${response.data.id} queued.`);
            setScript('');
            setQuotaRemaining(Number(response.quota.video_requests_remaining ?? 0));
            await onVideoCreated(response.data);
        } catch (err) {
            const normalized = err instanceof Error ? err : new Error('Failed to create video.');
            setError(normalized.message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">Video Generator</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Avatar</label>
                    <select
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        value={avatarId}
                        onChange={(event) => setAvatarId(event.target.value)}
                        required
                    >
                        {catalog.avatars.map((avatar, index) => {
                            const id = resolveCatalogItemId(avatar);
                            return (
                                <option key={id || `avatar-${index}`} value={id}>
                                    {(avatar.display_name as string) || (avatar.name as string) || id}
                                </option>
                            );
                        })}
                    </select>
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Voice</label>
                    <select
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        value={voiceId}
                        onChange={(event) => setVoiceId(event.target.value)}
                        required
                    >
                        {catalog.voices.map((voice, index) => {
                            const id = resolveCatalogItemId(voice);
                            return (
                                <option key={id || `voice-${index}`} value={id}>
                                    {(voice.display_name as string) || (voice.name as string) || id}
                                </option>
                            );
                        })}
                    </select>
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Script</label>
                    <textarea
                        className="min-h-32 w-full rounded-lg border border-slate-300 px-3 py-2"
                        value={script}
                        onChange={(event) => setScript(event.target.value)}
                        placeholder="Enter spoken script text."
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={!canSubmit}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                    {submitting ? 'Submitting...' : 'Generate Video'}
                </button>
            </form>

            {message && <p className="mt-4 text-sm text-emerald-700">{message}</p>}
            {quotaRemaining !== null && <p className="mt-2 text-sm text-slate-600">Remaining daily requests: {quotaRemaining}</p>}
            {error && <p className="mt-4 text-sm text-rose-700">{error}</p>}
        </section>
    );
}
