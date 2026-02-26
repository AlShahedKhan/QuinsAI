import { useEffect, useMemo, useRef, useState } from 'react';
import { heygenApi } from '../lib/heygenApi';
import type { CatalogDto, LiveSessionDto } from '../types/heygen';

type StreamingAvatarLike = {
    on?: (event: string, handler: (event: { detail?: MediaStream | null }) => void) => void;
    off?: (event: string, handler: (...args: unknown[]) => void) => void;
    start?: (options?: Record<string, unknown>) => Promise<unknown>;
    createStartAvatar?: (options?: Record<string, unknown>) => Promise<unknown>;
    stop?: () => Promise<unknown>;
};

function resolveId(item: Record<string, unknown>): string {
    const candidates = [item.avatar_id, item.voice_id, item.id, item.name];

    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim() !== '') {
            return candidate;
        }
    }

    return '';
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
        let mounted = true;
        heygenApi.getCatalog()
            .then((data) => {
                if (!mounted) return;
                setCatalog(data);
                if (data.avatars[0]) {
                    setAvatarId(resolveId(data.avatars[0]));
                }
                if (data.voices[0]) {
                    setVoiceId(resolveId(data.voices[0]));
                }
            })
            .catch((err: Error) => {
                if (!mounted) return;
                setError(err.message);
            });

        return () => {
            mounted = false;
        };
    }, []);

    const canStart = useMemo(
        () => !loading && session === null && avatarId !== '' && voiceId !== '',
        [loading, session, avatarId, voiceId],
    );

    async function startSession() {
        if (!canStart) return;

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
            const instance = new AvatarCtor({
                token: created.token,
            });

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
        } finally {
            setLoading(false);
        }
    }

    async function endSession() {
        if (!session) return;

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

    return (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">Live Avatar</h2>

            <div className="grid gap-4 md:grid-cols-3">
                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Avatar</label>
                    <select
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        value={avatarId}
                        onChange={(event) => setAvatarId(event.target.value)}
                    >
                        {catalog.avatars.map((avatar, index) => {
                            const id = resolveId(avatar);
                            return (
                                <option key={id || `live-avatar-${index}`} value={id}>
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
                    >
                        {catalog.voices.map((voice, index) => {
                            const id = resolveId(voice);
                            return (
                                <option key={id || `live-voice-${index}`} value={id}>
                                    {(voice.display_name as string) || (voice.name as string) || id}
                                </option>
                            );
                        })}
                    </select>
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Quality</label>
                    <select
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        value={quality}
                        onChange={(event) => setQuality(event.target.value as 'low' | 'medium' | 'high')}
                    >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                </div>
            </div>

            <div className="mt-4 flex gap-2">
                <button
                    type="button"
                    onClick={() => {
                        void startSession();
                    }}
                    disabled={!canStart}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                    {loading ? 'Working...' : 'Start Session'}
                </button>
                <button
                    type="button"
                    onClick={() => {
                        void endSession();
                    }}
                    disabled={loading || session === null}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
                >
                    End Session
                </button>
            </div>

            {session && (
                <p className="mt-3 text-sm text-slate-600">
                    Session #{session.id} | Provider session: {session.provider_session_id ?? 'pending'}
                </p>
            )}

            {statusMessage && <p className="mt-3 text-sm text-emerald-700">{statusMessage}</p>}
            {error && <p className="mt-3 text-sm text-rose-700">{error}</p>}

            <div className="mt-4 overflow-hidden rounded-lg border border-slate-300 bg-slate-950">
                <video ref={videoRef} className="h-64 w-full object-cover" autoPlay playsInline muted />
            </div>
        </section>
    );
}
