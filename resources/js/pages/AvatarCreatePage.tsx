import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FormNotice } from '../components/ui/FormNotice';
import { heygenApi } from '../lib/heygenApi';
import type { DigitalTwinDto, DigitalTwinStatus } from '../types/heygen';

const TERMINAL_DIGITAL_TWIN_STATUSES = new Set<DigitalTwinStatus>(['completed', 'failed']);

function formatDateTime(value: string | null): string {
    if (!value) {
        return 'N/A';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return 'N/A';
    }

    return date.toLocaleString();
}

function resolveDigitalTwinBadgeClass(status: DigitalTwinStatus): string {
    if (status === 'completed') {
        return 'status-badge status-completed';
    }

    if (status === 'failed') {
        return 'status-badge status-failed';
    }

    return 'status-badge status-default';
}

function buildAvatarWorkflowPath(path: string, avatarId: string): string {
    const params = new URLSearchParams({
        avatar_id: avatarId,
    });

    return `${path}?${params.toString()}`;
}

export function AvatarCreatePage() {
    const [digitalTwins, setDigitalTwins] = useState<DigitalTwinDto[]>([]);
    const [digitalTwinPage, setDigitalTwinPage] = useState(1);
    const [digitalTwinLastPage, setDigitalTwinLastPage] = useState(1);
    const [digitalTwinTotal, setDigitalTwinTotal] = useState(0);
    const [digitalTwinLoading, setDigitalTwinLoading] = useState(true);
    const [digitalTwinError, setDigitalTwinError] = useState<string | null>(null);
    const [digitalTwinNotice, setDigitalTwinNotice] = useState<string | null>(null);
    const [digitalTwinQuotaRemaining, setDigitalTwinQuotaRemaining] = useState<number | null>(null);
    const [readyAvatars, setReadyAvatars] = useState<DigitalTwinDto[]>([]);
    const [readyAvatarTotal, setReadyAvatarTotal] = useState(0);
    const [readyAvatarLoading, setReadyAvatarLoading] = useState(true);
    const [readyAvatarError, setReadyAvatarError] = useState<string | null>(null);
    const [avatarName, setAvatarName] = useState('');
    const [trainingFootage, setTrainingFootage] = useState<File | null>(null);
    const [consentVideo, setConsentVideo] = useState<File | null>(null);
    const [submittingTwin, setSubmittingTwin] = useState(false);
    const [uploadInputKey, setUploadInputKey] = useState(0);

    const canSubmitDigitalTwin = useMemo(() => (
        !submittingTwin
        && avatarName.trim() !== ''
        && trainingFootage !== null
        && consentVideo !== null
    ), [submittingTwin, avatarName, trainingFootage, consentVideo]);

    const loadDigitalTwins = useCallback(async (page: number) => {
        setDigitalTwinLoading(true);
        setDigitalTwinError(null);

        try {
            const response = await heygenApi.listDigitalTwins({ page, per_page: 12 });
            setDigitalTwins(response.data);
            setDigitalTwinPage(response.current_page);
            setDigitalTwinLastPage(Math.max(1, response.last_page));
            setDigitalTwinTotal(response.total);
        } catch (err) {
            const normalizedError = err instanceof Error ? err : new Error('Failed to load digital twin requests.');
            setDigitalTwinError(normalizedError.message);
        } finally {
            setDigitalTwinLoading(false);
        }
    }, []);

    const loadReadyAvatars = useCallback(async () => {
        setReadyAvatarLoading(true);
        setReadyAvatarError(null);

        try {
            const response = await heygenApi.listDigitalTwins({
                page: 1,
                per_page: 8,
                status: 'completed',
            });

            setReadyAvatars(response.data.filter((item) => item.provider_avatar_id !== null));
            setReadyAvatarTotal(response.total);
        } catch (err) {
            const normalizedError = err instanceof Error ? err : new Error('Failed to load ready avatars.');
            setReadyAvatarError(normalizedError.message);
        } finally {
            setReadyAvatarLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadDigitalTwins(digitalTwinPage);
    }, [digitalTwinPage, loadDigitalTwins]);

    useEffect(() => {
        void loadReadyAvatars();
    }, [loadReadyAvatars]);

    useEffect(() => {
        if (!digitalTwins.some((item) => !TERMINAL_DIGITAL_TWIN_STATUSES.has(item.status))) {
            return;
        }

        const intervalId = window.setInterval(() => {
            void loadDigitalTwins(digitalTwinPage);
            void loadReadyAvatars();
        }, 15000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [digitalTwins, digitalTwinPage, loadDigitalTwins, loadReadyAvatars]);

    async function handleDigitalTwinSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSubmitDigitalTwin) {
            return;
        }

        setSubmittingTwin(true);
        setDigitalTwinError(null);
        setDigitalTwinNotice(null);

        try {
            const formData = new FormData();
            formData.append('avatar_name', avatarName.trim());
            formData.append('training_footage', trainingFootage as Blob, trainingFootage.name);
            formData.append('video_consent', consentVideo as Blob, consentVideo.name);

            const response = await heygenApi.createDigitalTwin(formData);
            setDigitalTwinNotice(`Digital twin request #${response.data.id} submitted successfully.`);

            const remaining = response.quota.digital_twin_requests_remaining;
            setDigitalTwinQuotaRemaining(typeof remaining === 'number' ? remaining : null);

            setAvatarName('');
            setTrainingFootage(null);
            setConsentVideo(null);
            setUploadInputKey((value) => value + 1);

            await Promise.all([
                loadDigitalTwins(1),
                loadReadyAvatars(),
            ]);
        } catch (err) {
            const normalizedError = err instanceof Error ? err : new Error('Failed to submit digital twin request.');
            setDigitalTwinError(normalizedError.message);
        } finally {
            setSubmittingTwin(false);
        }
    }

    return (
        <section className="grid gap-6">
            <article className="surface-card page-enter p-6 sm:p-7">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Avatar Creation</p>
                        <h2 className="mt-1 text-2xl text-slate-900">Create and Track Your Digital Twins</h2>
                        <p className="mt-2 text-sm text-slate-600">
                            Submit training footage and consent video from your app, monitor the request lifecycle, and use completed avatars directly in video or live workflows.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Link to="/avatars" className="btn-secondary">
                            Browse Public Avatars
                        </Link>
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => {
                                void loadDigitalTwins(digitalTwinPage);
                                void loadReadyAvatars();
                            }}
                        >
                            Refresh
                        </button>
                    </div>
                </div>
            </article>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                <article className="surface-card page-enter stagger-1 p-6 sm:p-7">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">New Request</p>
                    <h3 className="mt-1 text-xl text-slate-900">Clone a Real Person</h3>
                    <p className="mt-2 text-sm text-slate-600">
                        Upload a clear training video and a matching consent video. The backend keeps provider credentials private and tracks the request for you.
                    </p>

                    <form className="mt-6 grid gap-4" onSubmit={handleDigitalTwinSubmit}>
                        <div>
                            <label className="field-label" htmlFor="digital-twin-name">Avatar Name</label>
                            <input
                                id="digital-twin-name"
                                className="text-field"
                                value={avatarName}
                                onChange={(event) => setAvatarName(event.target.value)}
                                placeholder="e.g. Abdullah Digital Twin"
                                maxLength={120}
                                required
                            />
                        </div>

                        <div>
                            <label className="field-label" htmlFor="digital-twin-training">Training Footage (MP4)</label>
                            <input
                                key={`training-${uploadInputKey}`}
                                id="digital-twin-training"
                                type="file"
                                className="text-field !py-2"
                                accept="video/mp4"
                                onChange={(event) => setTrainingFootage(event.target.files?.[0] ?? null)}
                                required
                            />
                            <p className="mt-1 text-xs text-slate-500">Use a clear, front-facing video. 30+ seconds usually gives better results.</p>
                        </div>

                        <div>
                            <label className="field-label" htmlFor="digital-twin-consent">Consent Video (MP4)</label>
                            <input
                                key={`consent-${uploadInputKey}`}
                                id="digital-twin-consent"
                                type="file"
                                className="text-field !py-2"
                                accept="video/mp4"
                                onChange={(event) => setConsentVideo(event.target.files?.[0] ?? null)}
                                required
                            />
                            <p className="mt-1 text-xs text-slate-500">Consent must clearly match the person being cloned and satisfy HeyGen identity rules.</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button type="submit" className="btn-primary" disabled={!canSubmitDigitalTwin}>
                                {submittingTwin ? 'Submitting...' : 'Submit Digital Twin'}
                            </button>
                            <Link to="/videos/generate" className="btn-secondary">
                                Go to Generate
                            </Link>
                        </div>
                    </form>

                    <div className="mt-4 space-y-3">
                        {digitalTwinNotice ? <FormNotice tone="success">{digitalTwinNotice}</FormNotice> : null}
                        {digitalTwinError ? <FormNotice tone="error">{digitalTwinError}</FormNotice> : null}
                    </div>

                    {digitalTwinQuotaRemaining !== null ? (
                        <div className="mt-4 rounded-2xl border border-slate-200/90 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
                            Remaining digital twin requests today:{' '}
                            <span className="font-semibold text-slate-900">{digitalTwinQuotaRemaining}</span>
                        </div>
                    ) : null}
                </article>

                <article className="surface-card page-enter stagger-2 p-6 sm:p-7">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Submission Notes</p>
                    <h3 className="mt-1 text-xl text-slate-900">Before You Upload</h3>

                    <div className="mt-5 grid gap-3">
                        <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 px-4 py-4">
                            <p className="text-sm font-semibold text-slate-900">Enterprise gating still applies</p>
                            <p className="mt-1 text-sm text-slate-600">
                                Your app can submit the request, but HeyGen still controls whether digital twin creation is enabled for your account tier.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 px-4 py-4">
                            <p className="text-sm font-semibold text-slate-900">File quality matters</p>
                            <p className="mt-1 text-sm text-slate-600">
                                Poor lighting, off-angle framing, or mismatched consent will usually lead to provider rejection or lower quality output.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 px-4 py-4">
                            <p className="text-sm font-semibold text-slate-900">Completed avatars become reusable</p>
                            <p className="mt-1 text-sm text-slate-600">
                                Once a request completes, you can send that avatar directly into the standard video generation or live avatar workflows.
                            </p>
                        </div>
                    </div>
                </article>
            </div>

            <article className="surface-card page-enter stagger-3 p-6 sm:p-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Ready Avatars</p>
                        <h3 className="mt-1 text-xl text-slate-900">Completed Digital Twins</h3>
                        <p className="mt-2 text-sm text-slate-600">
                            Showing the latest completed avatars available for immediate use. Total completed avatars: {readyAvatarTotal}.
                        </p>
                    </div>
                </div>

                {readyAvatarError ? (
                    <div className="mt-5">
                        <FormNotice tone="error">{readyAvatarError}</FormNotice>
                    </div>
                ) : null}

                {readyAvatarLoading ? (
                    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <div
                                key={`ready-avatar-skeleton-${index}`}
                                className="aspect-[4/5] animate-pulse rounded-2xl border border-slate-200/90 bg-slate-100"
                            />
                        ))}
                    </div>
                ) : readyAvatars.length === 0 ? (
                    <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-6 py-10 text-center">
                        <p className="text-sm font-semibold text-slate-900">No completed digital twins yet</p>
                        <p className="mt-1 text-sm text-slate-600">
                            Submit your first request above. Completed avatars will appear here when HeyGen finishes processing.
                        </p>
                    </div>
                ) : (
                    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {readyAvatars.map((avatar) => (
                            <article key={avatar.id} className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
                                <div className="relative aspect-[4/5] bg-slate-100">
                                    {avatar.preview_image_url ? (
                                        <img src={avatar.preview_image_url} alt={avatar.avatar_name} className="h-full w-full object-cover" loading="lazy" />
                                    ) : (
                                        <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,#dbeafe_0%,#eff6ff_45%,#f8fafc_100%)] px-4 text-center text-sm font-semibold text-slate-700">
                                            {avatar.avatar_name}
                                        </div>
                                    )}
                                </div>

                                <div className="grid gap-3 px-4 py-4">
                                    <div>
                                        <p className="text-base font-semibold text-slate-900">{avatar.avatar_name}</p>
                                        <p className="mt-1 font-mono text-[11px] text-slate-500">{avatar.provider_avatar_id}</p>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {avatar.provider_avatar_id ? (
                                            <>
                                                <Link to={buildAvatarWorkflowPath('/videos/generate', avatar.provider_avatar_id)} className="btn-primary !min-h-9 !rounded-lg !px-3 !py-1.5 !text-sm">
                                                    Use for Video
                                                </Link>
                                                <Link to={buildAvatarWorkflowPath('/live', avatar.provider_avatar_id)} className="btn-secondary !min-h-9 !rounded-lg !px-3 !py-1.5 !text-sm">
                                                    Use for Live
                                                </Link>
                                            </>
                                        ) : null}
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {avatar.preview_image_url ? (
                                            <a href={avatar.preview_image_url} target="_blank" rel="noreferrer" className="btn-secondary !min-h-8 !rounded-lg !px-2.5 !py-1 !text-xs">
                                                Preview Image
                                            </a>
                                        ) : null}
                                        {avatar.preview_video_url ? (
                                            <a href={avatar.preview_video_url} target="_blank" rel="noreferrer" className="btn-secondary !min-h-8 !rounded-lg !px-2.5 !py-1 !text-xs">
                                                Preview Video
                                            </a>
                                        ) : null}
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </article>

            <article className="surface-card page-enter stagger-4 p-6 sm:p-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Request History</p>
                        <h3 className="mt-1 text-xl text-slate-900">Digital Twin Requests</h3>
                        <p className="mt-2 text-sm text-slate-600">
                            Review the current page of requests, including provider IDs, timestamps, and failure details.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
                        Total requests: <span className="font-semibold text-slate-900">{digitalTwinTotal}</span>
                    </div>
                </div>

                {digitalTwinLoading ? (
                    <div className="mt-6 rounded-2xl border border-slate-200/90 bg-slate-50/80 px-4 py-6 text-sm text-slate-600">
                        Loading digital twin requests...
                    </div>
                ) : digitalTwins.length === 0 ? (
                    <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-6 text-sm text-slate-600">
                        No digital twin requests yet.
                    </div>
                ) : (
                    <div className="mt-6 grid gap-3 lg:grid-cols-2">
                        {digitalTwins.map((request) => (
                            <article key={request.id} className="rounded-2xl border border-slate-200/90 bg-white/90 px-4 py-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <p className="text-base font-semibold text-slate-900">{request.avatar_name}</p>
                                        <p className="mt-1 font-mono text-xs text-slate-500">Request #{request.id}</p>
                                    </div>
                                    <span className={resolveDigitalTwinBadgeClass(request.status)}>{request.status}</span>
                                </div>

                                <div className="mt-3 grid gap-1 text-sm text-slate-600">
                                    <p>
                                        Provider Avatar ID:{' '}
                                        <span className="font-mono text-xs text-slate-700">{request.provider_avatar_id ?? 'pending'}</span>
                                    </p>
                                    <p>Submitted: {formatDateTime(request.submitted_at)}</p>
                                    <p>Updated: {formatDateTime(request.updated_at)}</p>
                                </div>

                                {request.error_message ? (
                                    <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{request.error_message}</p>
                                ) : null}

                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                    {request.preview_image_url ? (
                                        <a href={request.preview_image_url} target="_blank" rel="noreferrer" className="btn-secondary !min-h-8 !rounded-lg !px-2.5 !py-1 !text-xs">
                                            Preview Image
                                        </a>
                                    ) : null}
                                    {request.preview_video_url ? (
                                        <a href={request.preview_video_url} target="_blank" rel="noreferrer" className="btn-secondary !min-h-8 !rounded-lg !px-2.5 !py-1 !text-xs">
                                            Preview Video
                                        </a>
                                    ) : null}
                                    {request.provider_avatar_id ? (
                                        <>
                                            <Link to={buildAvatarWorkflowPath('/videos/generate', request.provider_avatar_id)} className="btn-secondary !min-h-8 !rounded-lg !px-2.5 !py-1 !text-xs">
                                                Use for Video
                                            </Link>
                                            <Link to={buildAvatarWorkflowPath('/live', request.provider_avatar_id)} className="btn-secondary !min-h-8 !rounded-lg !px-2.5 !py-1 !text-xs">
                                                Use for Live
                                            </Link>
                                        </>
                                    ) : null}
                                </div>
                            </article>
                        ))}
                    </div>
                )}

                {digitalTwinTotal > 12 ? (
                    <div className="mt-5 flex flex-col gap-3 border-t border-slate-200/90 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-slate-600">
                            Page <span className="font-semibold text-slate-900">{digitalTwinPage}</span> of{' '}
                            <span className="font-semibold text-slate-900">{digitalTwinLastPage}</span>
                        </p>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                className="btn-secondary !min-h-9 !rounded-lg !px-3 !py-1.5 !text-sm"
                                disabled={digitalTwinPage === 1}
                                onClick={() => setDigitalTwinPage((page) => Math.max(1, page - 1))}
                            >
                                Previous
                            </button>
                            <button
                                type="button"
                                className="btn-secondary !min-h-9 !rounded-lg !px-3 !py-1.5 !text-sm"
                                disabled={digitalTwinPage === digitalTwinLastPage}
                                onClick={() => setDigitalTwinPage((page) => Math.min(digitalTwinLastPage, page + 1))}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                ) : null}
            </article>
        </section>
    );
}
