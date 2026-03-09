import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { heygenApi } from '../lib/heygenApi';
import { FormNotice } from '../components/ui/FormNotice';
import type { CatalogDto, LiveQuotaDto, LiveSessionDto } from '../types/heygen';

type StreamingAvatarEvent = {
    detail?: MediaStream | null;
    error?: unknown;
    message?: string;
};

type StreamingAvatarLike = {
    on?: (event: string, handler: (event: StreamingAvatarEvent) => void) => void;
    start?: (options?: Record<string, unknown>) => Promise<unknown>;
    createStartAvatar?: (options?: Record<string, unknown>) => Promise<unknown>;
    stop?: () => Promise<unknown>;
};

type LiveConnectionState = 'idle' | 'starting' | 'connecting' | 'live' | 'ending' | 'error';

const qualityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
] as const;

const disconnectEvents = ['stream_disconnected', 'stream_closed', 'disconnect', 'error'];

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

function formatDateTime(value: string | null): string {
    if (!value) {
        return 'N/A';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return 'N/A';
    }

    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

function formatElapsed(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    const hh = hours.toString().padStart(2, '0');
    const mm = minutes.toString().padStart(2, '0');
    const ss = remainingSeconds.toString().padStart(2, '0');

    return `${hh}:${mm}:${ss}`;
}

function resolveConnectionBadge(state: LiveConnectionState): { label: string; className: string } {
    switch (state) {
        case 'starting':
            return { label: 'Starting', className: 'status-badge status-default' };
        case 'connecting':
            return { label: 'Connecting', className: 'status-badge status-default' };
        case 'live':
            return { label: 'Live', className: 'status-badge status-completed' };
        case 'ending':
            return { label: 'Ending', className: 'status-badge status-default' };
        case 'error':
            return { label: 'Error', className: 'status-badge status-failed' };
        default:
            return { label: 'Idle', className: 'status-badge status-default' };
    }
}

export function LiveAvatarPage() {
    const { state } = useAuth();
    const [searchParams] = useSearchParams();
    const [catalog, setCatalog] = useState<CatalogDto>({ avatars: [], voices: [] });
    const [avatarId, setAvatarId] = useState('');
    const [voiceId, setVoiceId] = useState('');
    const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('high');
    const [session, setSession] = useState<LiveSessionDto | null>(null);
    const [quota, setQuota] = useState<LiveQuotaDto | null>(null);
    const [connectionState, setConnectionState] = useState<LiveConnectionState>('idle');
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const sdkRef = useRef<StreamingAvatarLike | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const sessionRef = useRef<LiveSessionDto | null>(null);
    const accessTokenRef = useRef<string | null>(state.accessToken);
    const cleanupSessionIdRef = useRef<number | null>(null);
    const isMountedRef = useRef(true);
    const requestedAvatarId = searchParams.get('avatar_id') ?? '';
    const requestedVoiceId = searchParams.get('voice_id') ?? '';

    useEffect(() => {
        accessTokenRef.current = state.accessToken;
    }, [state.accessToken]);

    useEffect(() => {
        sessionRef.current = session;
    }, [session]);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const clearVideoElement = useCallback(() => {
        if (!videoRef.current) {
            return;
        }

        const mediaStream = videoRef.current.srcObject;

        if (mediaStream instanceof MediaStream) {
            mediaStream.getTracks().forEach((track) => track.stop());
        }

        videoRef.current.srcObject = null;
    }, []);

    const stopSdkInstance = useCallback(async () => {
        const instance = sdkRef.current;
        sdkRef.current = null;

        if (instance && typeof instance.stop === 'function') {
            try {
                await instance.stop();
            } catch {
                // Ignore SDK shutdown failures during cleanup.
            }
        }
    }, []);

    const loadQuota = useCallback(async () => {
        try {
            const quotaData = await heygenApi.getLiveQuota();
            if (isMountedRef.current) {
                setQuota(quotaData);
            }
        } catch {
            // Ignore non-critical quota refresh failures.
        }
    }, []);

    useEffect(() => {
        let active = true;

        heygenApi.getCatalog()
            .then((data) => {
                if (!active) {
                    return;
                }

                setCatalog(data);

                const preferredAvatarId = requestedAvatarId !== '' && data.avatars.some((avatar) => resolveId(avatar) === requestedAvatarId)
                    ? requestedAvatarId
                    : (data.avatars[0] ? resolveId(data.avatars[0]) : '');
                const preferredVoiceId = requestedVoiceId !== '' && data.voices.some((voice) => resolveId(voice) === requestedVoiceId)
                    ? requestedVoiceId
                    : (data.voices[0] ? resolveId(data.voices[0]) : '');

                setAvatarId((current) => current || preferredAvatarId);
                setVoiceId((current) => current || preferredVoiceId);
            })
            .catch((err: Error) => {
                if (!active) {
                    return;
                }

                setError(err.message);
            });

        void loadQuota();

        return () => {
            active = false;
        };
    }, [loadQuota, requestedAvatarId, requestedVoiceId]);

    useEffect(() => {
        if (session?.started_at === null || connectionState !== 'live') {
            setElapsedSeconds(0);
            return;
        }

        const updateElapsed = () => {
            const startedAt = new Date(session.started_at as string);
            if (Number.isNaN(startedAt.getTime())) {
                setElapsedSeconds(0);
                return;
            }

            const seconds = Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000));
            setElapsedSeconds(seconds);
        };

        updateElapsed();
        const intervalId = window.setInterval(updateElapsed, 1000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [connectionState, session?.started_at]);

    const endSessionRequest = useCallback(async (sessionId: number, keepalive = false) => {
        if (keepalive) {
            const token = accessTokenRef.current;
            if (!token) {
                return;
            }

            await fetch(`/api/heygen/live/sessions/${sessionId}/end`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                },
                credentials: 'same-origin',
                keepalive: true,
            });

            return;
        }

        const response = await heygenApi.endLiveSession(sessionId);

        if (isMountedRef.current) {
            setQuota(response.quota);
        }
    }, []);

    const cleanupActiveSession = useCallback(async (options: {
        sessionOverride?: LiveSessionDto | null;
        keepalive?: boolean;
        updateState?: boolean;
        reasonMessage?: string | null;
        suppressErrors?: boolean;
    } = {}) => {
        const targetSession = options.sessionOverride ?? sessionRef.current;

        if (targetSession === null || cleanupSessionIdRef.current === targetSession.id) {
            return;
        }

        cleanupSessionIdRef.current = targetSession.id;
        const keepalive = options.keepalive ?? false;
        const endRequestPromise = endSessionRequest(targetSession.id, keepalive);

        await stopSdkInstance();

        try {
            await endRequestPromise;
        } catch (err) {
            if (!options.suppressErrors && isMountedRef.current) {
                const normalized = err instanceof Error ? err : new Error('Failed to end live session.');
                setError(normalized.message);
            }
        } finally {
            if (sessionRef.current?.id === targetSession.id) {
                sessionRef.current = null;
            }

            clearVideoElement();

            if ((options.updateState ?? true) && isMountedRef.current) {
                setSession(null);
                setConnectionState('idle');
                setElapsedSeconds(0);
                setStatusMessage(options.reasonMessage ?? 'Live avatar session ended.');
            }

            cleanupSessionIdRef.current = null;

            if (!keepalive) {
                void loadQuota();
            }
        }
    }, [clearVideoElement, endSessionRequest, loadQuota, stopSdkInstance]);

    useEffect(() => {
        function handlePageHide() {
            const activeSession = sessionRef.current;
            if (activeSession === null) {
                return;
            }

            void cleanupActiveSession({
                sessionOverride: activeSession,
                keepalive: true,
                updateState: false,
                suppressErrors: true,
            });
        }

        window.addEventListener('pagehide', handlePageHide);

        return () => {
            window.removeEventListener('pagehide', handlePageHide);
            const activeSession = sessionRef.current;

            if (activeSession) {
                void cleanupActiveSession({
                    sessionOverride: activeSession,
                    keepalive: true,
                    updateState: false,
                    suppressErrors: true,
                });
            }
        };
    }, [cleanupActiveSession]);

    const handleUnexpectedDisconnect = useCallback((message: string, liveSession: LiveSessionDto) => {
        if (!isMountedRef.current) {
            return;
        }

        setError(message);
        setStatusMessage(null);
        setConnectionState('error');

        void cleanupActiveSession({
            sessionOverride: liveSession,
            reasonMessage: null,
            suppressErrors: true,
        });
    }, [cleanupActiveSession]);

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
        setConnectionState('starting');

        let createdSession: LiveSessionDto | null = null;

        try {
            const createdResponse = await heygenApi.createLiveSession({
                avatar_id: avatarId,
                voice_id: voiceId,
                quality,
            });

            createdSession = createdResponse.data;
            sessionRef.current = createdSession;
            setSession(createdSession);
            setQuota(createdResponse.quota);
            setConnectionState('connecting');
            setStatusMessage('Connecting live avatar stream...');

            const sdkModule = await import('@heygen/streaming-avatar');
            const constructorCandidate = (sdkModule as Record<string, unknown>).StreamingAvatar
                ?? (sdkModule as Record<string, unknown>).default;

            if (typeof constructorCandidate !== 'function') {
                throw new Error('Unable to initialize HeyGen streaming SDK.');
            }

            const AvatarCtor = constructorCandidate as new (options?: Record<string, unknown>) => StreamingAvatarLike;
            const instance = new AvatarCtor({ token: createdSession.token });

            if (typeof instance.on === 'function') {
                instance.on('stream_ready', (event: StreamingAvatarEvent) => {
                    if (!isMountedRef.current || createdSession === null) {
                        return;
                    }

                    if (videoRef.current && event.detail instanceof MediaStream) {
                        videoRef.current.srcObject = event.detail;
                        void videoRef.current.play().catch(() => undefined);
                    }

                    void heygenApi.activateLiveSession(createdSession.id)
                        .then((activeSession) => {
                            if (!isMountedRef.current) {
                                return;
                            }

                            sessionRef.current = activeSession;
                            setSession(activeSession);
                            setConnectionState('live');
                            setStatusMessage('Live avatar session started.');
                            setError(null);
                        })
                        .catch((err: Error) => {
                            handleUnexpectedDisconnect(err.message, createdSession as LiveSessionDto);
                        });
                });

                disconnectEvents.forEach((eventName) => {
                    instance.on?.(eventName, () => {
                        if (createdSession === null || cleanupSessionIdRef.current === createdSession.id) {
                            return;
                        }

                        handleUnexpectedDisconnect('Live stream disconnected unexpectedly.', createdSession);
                    });
                });
            }

            if (typeof instance.createStartAvatar === 'function') {
                await instance.createStartAvatar({
                    session_id: createdSession.provider_session_id,
                    quality,
                });
            } else if (typeof instance.start === 'function') {
                await instance.start({
                    session_id: createdSession.provider_session_id,
                    quality,
                });
            }

            sdkRef.current = instance;
        } catch (err) {
            if (createdSession !== null) {
                await cleanupActiveSession({
                    sessionOverride: createdSession,
                    updateState: false,
                    suppressErrors: true,
                });
            } else {
                await stopSdkInstance();
                clearVideoElement();
            }

            const normalized = err instanceof Error ? err : new Error('Failed to start live session.');
            if (isMountedRef.current) {
                sessionRef.current = null;
                setSession(null);
                setConnectionState('error');
                setStatusMessage(null);
                setError(normalized.message);
            }

            void loadQuota();
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }

    async function endSession() {
        if (!session) {
            return;
        }

        setLoading(true);
        setError(null);
        setConnectionState('ending');

        try {
            await cleanupActiveSession({
                sessionOverride: session,
                reasonMessage: 'Live avatar session ended.',
            });
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }

    const selectedAvatar = catalog.avatars.find((avatar) => resolveId(avatar) === avatarId);
    const selectedVoice = catalog.voices.find((voice) => resolveId(voice) === voiceId);
    const connectionBadge = resolveConnectionBadge(connectionState);

    return (
        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <article className="surface-card page-enter p-6 sm:p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Realtime Streaming</p>
                <h2 className="mt-1 text-2xl text-slate-900">Live Avatar Session</h2>
                <p className="mt-2 text-sm text-slate-600">Launch or end live avatar sessions with backend-minted ephemeral tokens and tracked quota usage.</p>

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
                            {loading && connectionState !== 'ending' ? 'Working...' : 'Start Session'}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                void endSession();
                            }}
                            disabled={loading || session === null}
                            className="btn-secondary"
                        >
                            {connectionState === 'ending' ? 'Ending...' : 'End Session'}
                        </button>
                    </div>
                </div>

                <div className="mt-5 space-y-3">
                    {statusMessage ? <FormNotice tone="success">{statusMessage}</FormNotice> : null}
                    {error ? <FormNotice tone="error">{error}</FormNotice> : null}
                </div>

                <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                    <div className="rounded-xl border border-slate-200/90 bg-white/85 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Selected Avatar</p>
                        <p className="mt-1 font-semibold text-slate-900">{selectedAvatar ? resolveLabel(selectedAvatar) : 'N/A'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200/90 bg-white/85 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Selected Voice</p>
                        <p className="mt-1 font-semibold text-slate-900">{selectedVoice ? resolveLabel(selectedVoice) : 'N/A'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200/90 bg-white/85 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Remaining Minutes</p>
                        <p className="mt-1 font-semibold text-slate-900">{quota ? quota.live_minutes_remaining : '...'}</p>
                        <p className="mt-1 text-xs text-slate-500">
                            Used {quota?.live_minutes_used ?? 0} / {quota?.daily_live_minute_limit ?? '...'}
                        </p>
                    </div>
                </div>
            </article>

            <article className="surface-card page-enter stagger-1 p-6 sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Live Output</p>
                        <h3 className="mt-1 text-xl text-slate-900">Streaming Stage</h3>
                    </div>

                    <span className={connectionBadge.className}>
                        {connectionBadge.label}
                    </span>
                </div>

                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-950 shadow-inner">
                    <div className="relative aspect-video w-full">
                        <video ref={videoRef} className="h-full w-full object-cover" autoPlay playsInline muted />
                        {connectionState !== 'live' && (
                            <div className="absolute inset-0 grid place-items-center bg-slate-950/78 px-6 text-center">
                                <div>
                                    <p className="text-sm font-semibold text-slate-100">
                                        {connectionState === 'connecting' || connectionState === 'starting'
                                            ? 'Connecting live stream...'
                                            : 'No active stream'}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-300">
                                        {connectionState === 'connecting' || connectionState === 'starting'
                                            ? 'Waiting for WebRTC media and SDK readiness.'
                                            : 'Start a session to initialize WebRTC media.'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200/90 bg-white/85 px-4 py-3 text-sm text-slate-600">
                        <p>Internal session ID: <span className="font-semibold text-slate-900">{session?.id ?? 'N/A'}</span></p>
                        <p className="mt-1">Provider session: <span className="font-mono text-xs text-slate-700">{session?.provider_session_id ?? 'pending'}</span></p>
                    </div>

                    <div className="rounded-xl border border-slate-200/90 bg-white/85 px-4 py-3 text-sm text-slate-600">
                        <p>Started: <span className="font-semibold text-slate-900">{formatDateTime(session?.started_at ?? null)}</span></p>
                        <p className="mt-1">Elapsed: <span className="font-semibold text-slate-900">{formatElapsed(elapsedSeconds)}</span></p>
                    </div>
                </div>
            </article>
        </section>
    );
}
