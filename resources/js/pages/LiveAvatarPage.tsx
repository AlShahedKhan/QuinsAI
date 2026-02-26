import { useEffect, useMemo, useRef, useState } from 'react';
import { heygenApi } from '../lib/heygenApi';
import { FormNotice } from '../components/ui/FormNotice';
import type { CatalogDto, LiveSessionDto } from '../types/heygen';

type StreamingAvatarLike = {
    on?: (event: string, handler: (event: { detail?: MediaStream | null }) => void) => void;
    start?: (options?: Record<string, unknown>) => Promise<unknown>;
    createStartAvatar?: (options?: Record<string, unknown>) => Promise<unknown>;
    stop?: () => Promise<unknown>;
};

const qualityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
] as const;

function resolveId(item: Record<string, unknown>): string {
    const candidates = [item.avatar_id, item.voice_id, item.id, item.name];

    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim() !== '') {
            return candidate;
        }
    }

    return '';
}

function resolveLabel(item: Record<string, unknown>): string {
    const candidates = [item.display_name, item.name, item.avatar_id, item.voice_id, item.id];

    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim() !== '') {
            return candidate;
        }
    }

    return 'Unknown';
}

export function LiveAvatarPage() {
    const [catalog, setCatalog] = useState<CatalogDto>({ avatars: [], voices: [] });
    const [avatarId, setAvatarId] = useState('');
    const [voiceId, setVoiceId] = useState('');
    const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('high');
    const [session, setSession] = useState<LiveSessionDto | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const sdkRef = useRef<StreamingAvatarLike | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        let active = true;

        heygenApi.getCatalog()
            .then((data) => {
                if (!active) {
                    return;
                }

                setCatalog(data);
                setAvatarId((current) => current || (data.avatars[0] ? resolveId(data.avatars[0]) : ''));
                setVoiceId((current) => current || (data.voices[0] ? resolveId(data.voices[0]) : ''));
            })
            .catch((err: Error) => {
                if (!active) {
                    return;
                }

                setError(err.message);
            });

        return () => {
            active = false;
        };
    }, []);

    const canStart = useMemo(
        () => !loading && session === null && avatarId !== '' && voiceId !== '',
        [loading, session, avatarId, voiceId],
    );

    async function startSession() {
        if (!canStart) {
            return;
        }

        setLoading(true);
        setError(null);
        setStatusMessage('Creating live session...');

        try {
            const created = await heygenApi.createLiveSession({
                avatar_id: avatarId,
                voice_id: voiceId,
                quality,
            });

            setSession(created);

            const sdkModule = await import('@heygen/streaming-avatar');
            const constructorCandidate = (sdkModule as Record<string, unknown>).StreamingAvatar
                ?? (sdkModule as Record<string, unknown>).default;

            if (typeof constructorCandidate !== 'function') {
                throw new Error('Unable to initialize HeyGen streaming SDK.');
            }

            const AvatarCtor = constructorCandidate as new (options?: Record<string, unknown>) => StreamingAvatarLike;
            const instance = new AvatarCtor({ token: created.token });

            if (typeof instance.on === 'function') {
                instance.on('stream_ready', (event: { detail?: MediaStream | null }) => {
                    if (videoRef.current && event.detail instanceof MediaStream) {
                        videoRef.current.srcObject = event.detail;
                        void videoRef.current.play().catch(() => undefined);
                    }
                });
            }

            if (typeof instance.createStartAvatar === 'function') {
                await instance.createStartAvatar({
                    session_id: created.provider_session_id,
                    quality,
                });
            } else if (typeof instance.start === 'function') {
                await instance.start({
                    session_id: created.provider_session_id,
                    quality,
                });
            }

            sdkRef.current = instance;
            setStatusMessage('Live avatar session started.');
        } catch (err) {
            const normalized = err instanceof Error ? err : new Error('Failed to start live session.');
            setError(normalized.message);
            setStatusMessage(null);
            setSession(null);
        } finally {
            setLoading(false);
        }
    }

    async function endSession() {
        if (!session) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            if (sdkRef.current && typeof sdkRef.current.stop === 'function') {
                await sdkRef.current.stop();
            }

            await heygenApi.endLiveSession(session.id);
            setSession(null);
            setStatusMessage('Live avatar session ended.');
            sdkRef.current = null;

            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        } catch (err) {
            const normalized = err instanceof Error ? err : new Error('Failed to end live session.');
            setError(normalized.message);
        } finally {
            setLoading(false);
        }
    }

    const selectedAvatar = catalog.avatars.find((avatar) => resolveId(avatar) === avatarId);
    const selectedVoice = catalog.voices.find((voice) => resolveId(voice) === voiceId);

    return (
        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <article className="surface-card page-enter p-6 sm:p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Realtime Streaming</p>
                <h2 className="mt-1 text-2xl text-slate-900">Live Avatar Session</h2>
                <p className="mt-2 text-sm text-slate-600">Launch or end live avatar sessions with backend-minted ephemeral tokens.</p>

                <div className="mt-5 grid gap-5">
                    <div>
                        <label className="field-label" htmlFor="live-avatar">Avatar</label>
                        <select
                            id="live-avatar"
                            className="select-field"
                            value={avatarId}
                            onChange={(event) => setAvatarId(event.target.value)}
                        >
                            {catalog.avatars.length === 0 && <option value="">No avatars available</option>}
                            {catalog.avatars.map((avatar, index) => {
                                const id = resolveId(avatar);
                                return (
                                    <option key={id || `live-avatar-${index}`} value={id}>
                                        {resolveLabel(avatar)}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    <div>
                        <label className="field-label" htmlFor="live-voice">Voice</label>
                        <select
                            id="live-voice"
                            className="select-field"
                            value={voiceId}
                            onChange={(event) => setVoiceId(event.target.value)}
                        >
                            {catalog.voices.length === 0 && <option value="">No voices available</option>}
                            {catalog.voices.map((voice, index) => {
                                const id = resolveId(voice);
                                return (
                                    <option key={id || `live-voice-${index}`} value={id}>
                                        {resolveLabel(voice)}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    <div>
                        <label className="field-label">Streaming Quality</label>
                        <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200/90 bg-slate-50 p-1">
                            {qualityOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setQuality(option.value)}
                                    className={quality === option.value
                                        ? 'rounded-lg bg-white px-2 py-2 text-sm font-semibold text-slate-900 shadow-sm'
                                        : 'rounded-lg px-2 py-2 text-sm font-semibold text-slate-500'}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                        <button
                            type="button"
                            onClick={() => {
                                void startSession();
                            }}
                            disabled={!canStart}
                            className="btn-primary"
                        >
                            {loading ? 'Working...' : 'Start Session'}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                void endSession();
                            }}
                            disabled={loading || session === null}
                            className="btn-secondary"
                        >
                            End Session
                        </button>
                    </div>
                </div>

                <div className="mt-5 space-y-3">
                    {statusMessage && <FormNotice tone="success">{statusMessage}</FormNotice>}
                    {error && <FormNotice tone="error">{error}</FormNotice>}
                </div>

                <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200/90 bg-white/85 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Selected Avatar</p>
                        <p className="mt-1 font-semibold text-slate-900">{selectedAvatar ? resolveLabel(selectedAvatar) : 'N/A'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200/90 bg-white/85 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Selected Voice</p>
                        <p className="mt-1 font-semibold text-slate-900">{selectedVoice ? resolveLabel(selectedVoice) : 'N/A'}</p>
                    </div>
                </div>
            </article>

            <article className="surface-card page-enter stagger-1 p-6 sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Live Output</p>
                        <h3 className="mt-1 text-xl text-slate-900">Streaming Stage</h3>
                    </div>

                    <span className={`status-badge ${session ? 'status-completed' : 'status-default'}`}>
                        {session ? 'Session Active' : 'Session Idle'}
                    </span>
                </div>

                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-950 shadow-inner">
                    <div className="relative aspect-video w-full">
                        <video ref={videoRef} className="h-full w-full object-cover" autoPlay playsInline muted />
                        {!session && (
                            <div className="absolute inset-0 grid place-items-center bg-slate-950/78 px-6 text-center">
                                <div>
                                    <p className="text-sm font-semibold text-slate-100">No active stream</p>
                                    <p className="mt-1 text-xs text-slate-300">Start a session to initialize WebRTC media.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-4 rounded-xl border border-slate-200/90 bg-white/85 px-4 py-3 text-sm text-slate-600">
                    <p>Internal session ID: <span className="font-semibold text-slate-900">{session?.id ?? 'N/A'}</span></p>
                    <p className="mt-1">Provider session: <span className="font-mono text-xs text-slate-700">{session?.provider_session_id ?? 'pending'}</span></p>
                </div>
            </article>
        </section>
    );
}
