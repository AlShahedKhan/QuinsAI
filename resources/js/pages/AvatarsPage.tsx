import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { FormNotice } from '../components/ui/FormNotice';
import { heygenApi } from '../lib/heygenApi';
import type { CatalogItem, DigitalTwinDto, DigitalTwinStatus } from '../types/heygen';

type AvatarTab = 'public' | 'my';
type AvatarVisibility = AvatarTab | 'unknown';

type AvatarCard = {
    id: string;
    name: string;
    previewUrl: string | null;
    visibility: AvatarVisibility;
    looks: number | null;
    categories: string[];
};

const DIGITAL_TWIN_DOC_URL = 'https://docs.heygen.com/reference/submit-video-avatar-creation-request';
const PHOTO_AVATAR_DOC_URL = 'https://docs.heygen.com/reference/create-photo-avatar';
const HEYGEN_STUDIO_AVATARS_URL = 'https://app.heygen.com/avatars';
const TERMINAL_DIGITAL_TWIN_STATUSES = new Set<DigitalTwinStatus>(['completed', 'failed']);

function readFirstString(item: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
        const value = item[key];
        if (typeof value === 'string' && value.trim() !== '') {
            return value.trim();
        }
    }

    return null;
}

function readFirstNumber(item: Record<string, unknown>, keys: string[]): number | null {
    for (const key of keys) {
        const value = item[key];

        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }

        if (typeof value === 'string') {
            const parsed = Number(value);
            if (!Number.isNaN(parsed)) {
                return parsed;
            }
        }
    }

    return null;
}

function readBoolean(item: Record<string, unknown>, keys: string[]): boolean | null {
    for (const key of keys) {
        const value = item[key];

        if (typeof value === 'boolean') {
            return value;
        }

        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            if (normalized === 'true') {
                return true;
            }

            if (normalized === 'false') {
                return false;
            }
        }
    }

    return null;
}

function collectCategoryValues(item: Record<string, unknown>, keys: string[]): string[] {
    const values: string[] = [];

    for (const key of keys) {
        const rawValue = item[key];

        if (typeof rawValue === 'string' && rawValue.trim() !== '') {
            values.push(rawValue.trim());
            continue;
        }

        if (Array.isArray(rawValue)) {
            for (const entry of rawValue) {
                if (typeof entry === 'string' && entry.trim() !== '') {
                    values.push(entry.trim());
                }
            }
        }
    }

    return [...new Set(values)];
}

function resolveVisibility(item: Record<string, unknown>, currentUserId: number | null): AvatarVisibility {
    const explicitPublic = readBoolean(item, ['is_public', 'public', 'isPublic']);
    if (explicitPublic !== null) {
        return explicitPublic ? 'public' : 'my';
    }

    const visibility = readFirstString(item, ['visibility', 'scope', 'type']);
    if (visibility !== null) {
        const normalized = visibility.toLowerCase();
        if (normalized.includes('public')) {
            return 'public';
        }

        if (normalized.includes('private') || normalized.includes('my')) {
            return 'my';
        }
    }

    if (currentUserId !== null) {
        const ownerId = readFirstNumber(item, ['user_id', 'owner_id', 'creator_id', 'created_by']);
        if (ownerId !== null) {
            return ownerId === currentUserId ? 'my' : 'public';
        }
    }

    return 'unknown';
}

function normalizeAvatar(item: CatalogItem, currentUserId: number | null): AvatarCard | null {
    const raw = item as Record<string, unknown>;

    const id = readFirstString(raw, ['avatar_id', 'id', 'name']);
    if (id === null) {
        return null;
    }

    const name = readFirstString(raw, ['display_name', 'name', 'avatar_name', 'avatar_id', 'id']) ?? id;
    const previewUrl = readFirstString(raw, [
        'preview_image_url',
        'preview_url',
        'thumbnail_url',
        'avatar_image_url',
        'image_url',
        'photo_url',
        'cover_url',
    ]);

    const looks = readFirstNumber(raw, ['looks', 'looks_count', 'look_count']);

    const categories = collectCategoryValues(raw, [
        'category',
        'categories',
        'avatar_type',
        'type',
        'style',
        'tags',
        'gender',
    ]);

    return {
        id,
        name,
        previewUrl,
        looks,
        categories,
        visibility: resolveVisibility(raw, currentUserId),
    };
}

function normalizeDigitalTwinAvatar(item: DigitalTwinDto): AvatarCard | null {
    if (item.status !== 'completed') {
        return null;
    }

    const id = item.provider_avatar_id ?? `digital-twin-${item.id}`;

    return {
        id,
        name: item.avatar_name,
        previewUrl: item.preview_image_url,
        visibility: 'my',
        looks: null,
        categories: ['Digital Twin'],
    };
}

function resolveInitials(name: string): string {
    const parts = name
        .split(/\s+/)
        .map((part) => part.trim())
        .filter((part) => part !== '');

    if (parts.length === 0) {
        return 'AV';
    }

    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

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

export function AvatarsPage() {
    const { state } = useAuth();
    const [publicAvatars, setPublicAvatars] = useState<AvatarCard[]>([]);
    const [activeTab, setActiveTab] = useState<AvatarTab>('public');
    const [activeCategory, setActiveCategory] = useState('All');
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [publicAvatarCategories, setPublicAvatarCategories] = useState<string[]>([]);
    const [publicAvatarTotal, setPublicAvatarTotal] = useState(0);
    const [publicAvatarLastPage, setPublicAvatarLastPage] = useState(1);
    const [publicAvatarLastSyncedAt, setPublicAvatarLastSyncedAt] = useState<string | null>(null);
    const [digitalTwins, setDigitalTwins] = useState<DigitalTwinDto[]>([]);
    const [digitalTwinLoading, setDigitalTwinLoading] = useState(false);
    const [digitalTwinError, setDigitalTwinError] = useState<string | null>(null);
    const [digitalTwinNotice, setDigitalTwinNotice] = useState<string | null>(null);
    const [digitalTwinQuotaRemaining, setDigitalTwinQuotaRemaining] = useState<number | null>(null);
    const [avatarName, setAvatarName] = useState('');
    const [trainingFootage, setTrainingFootage] = useState<File | null>(null);
    const [consentVideo, setConsentVideo] = useState<File | null>(null);
    const [submittingTwin, setSubmittingTwin] = useState(false);
    const [uploadInputKey, setUploadInputKey] = useState(0);

    const currentUserId = state.user?.id ?? null;

    const loadPublicAvatars = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await heygenApi.listPublicAvatars({
                page: currentPage,
                per_page: 50,
                search: debouncedQuery === '' ? undefined : debouncedQuery,
                category: activeCategory === 'All' ? undefined : activeCategory,
            });

            const normalized = response.data
                .map((item) => normalizeAvatar(item, currentUserId))
                .filter((item): item is AvatarCard => item !== null);
            setPublicAvatars(normalized);
            setPublicAvatarCategories(response.meta.categories);
            setPublicAvatarTotal(response.total);
            setPublicAvatarLastPage(response.last_page);
            setPublicAvatarLastSyncedAt(response.meta.last_synced_at);
        } catch (err) {
            const normalizedError = err instanceof Error ? err : new Error('Failed to load avatars.');
            setError(normalizedError.message);
        } finally {
            setLoading(false);
        }
    }, [activeCategory, currentPage, currentUserId, debouncedQuery]);

    const loadDigitalTwins = useCallback(async () => {
        setDigitalTwinLoading(true);
        setDigitalTwinError(null);

        try {
            const response = await heygenApi.listDigitalTwins(1);
            setDigitalTwins(response.data);
        } catch (err) {
            const normalizedError = err instanceof Error ? err : new Error('Failed to load digital twin requests.');
            setDigitalTwinError(normalizedError.message);
        } finally {
            setDigitalTwinLoading(false);
        }
    }, []);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setDebouncedQuery(query.trim());
        }, 250);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [query]);

    useEffect(() => {
        void loadDigitalTwins();
    }, [loadDigitalTwins]);

    useEffect(() => {
        if (activeTab !== 'public') {
            return;
        }

        void loadPublicAvatars();
    }, [activeTab, loadPublicAvatars]);

    useEffect(() => {
        if (!digitalTwins.some((item) => !TERMINAL_DIGITAL_TWIN_STATUSES.has(item.status))) {
            return;
        }

        const intervalId = window.setInterval(() => {
            void loadDigitalTwins();
        }, 15000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [digitalTwins, loadDigitalTwins]);

    const myAvatars = useMemo(() => (
        digitalTwins
            .map((item) => normalizeDigitalTwinAvatar(item))
            .filter((item): item is AvatarCard => item !== null)
    ), [digitalTwins]);

    const counts = useMemo(() => {
        return {
            public: publicAvatarTotal,
            my: myAvatars.length,
        };
    }, [myAvatars.length, publicAvatarTotal]);

    const availableCategories = useMemo(() => {
        if (activeTab === 'public') {
            return ['All', ...publicAvatarCategories];
        }

        const set = new Set<string>();
        for (const avatar of myAvatars) {
            for (const category of avatar.categories) {
                set.add(category);
            }
        }

        return ['All', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
    }, [activeTab, myAvatars, publicAvatarCategories]);

    useEffect(() => {
        if (!availableCategories.includes(activeCategory)) {
            setActiveCategory('All');
        }
    }, [availableCategories, activeCategory]);

    const filteredMyAvatars = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        return myAvatars.filter((avatar) => {
            const inCategory = activeCategory === 'All' || avatar.categories.includes(activeCategory);
            if (!inCategory) {
                return false;
            }

            if (normalizedQuery === '') {
                return true;
            }

            const haystack = [
                avatar.name,
                avatar.id,
                ...avatar.categories,
            ].join(' ').toLowerCase();

            return haystack.includes(normalizedQuery);
        });
    }, [activeCategory, myAvatars, query]);

    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, activeCategory, query]);

    const pageSize = 50;
    const totalPages = activeTab === 'public'
        ? Math.max(1, publicAvatarLastPage)
        : Math.max(1, Math.ceil(filteredMyAvatars.length / Math.max(filteredMyAvatars.length, 1)));

    const displayAvatars = activeTab === 'public' ? publicAvatars : filteredMyAvatars;

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const pageStart = activeTab !== 'public' || publicAvatarTotal === 0
        ? 0
        : ((currentPage - 1) * pageSize) + 1;
    const pageEnd = activeTab !== 'public'
        ? filteredMyAvatars.length
        : Math.min(currentPage * pageSize, publicAvatarTotal);

    const canSubmitDigitalTwin = useMemo(() => (
        !submittingTwin
        && avatarName.trim() !== ''
        && trainingFootage !== null
        && consentVideo !== null
    ), [submittingTwin, avatarName, trainingFootage, consentVideo]);

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
            formData.append('training_footage', trainingFootage as Blob, trainingFootage?.name);
            formData.append('video_consent', consentVideo as Blob, consentVideo?.name);

            const response = await heygenApi.createDigitalTwin(formData);
            setDigitalTwinNotice(`Digital twin request #${response.data.id} submitted successfully.`);

            const remaining = response.quota.digital_twin_requests_remaining;
            setDigitalTwinQuotaRemaining(typeof remaining === 'number' ? remaining : null);

            setAvatarName('');
            setTrainingFootage(null);
            setConsentVideo(null);
            setUploadInputKey((value) => value + 1);

            await loadDigitalTwins();
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
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Avatar Gallery</p>
                        <h2 className="mt-1 text-2xl text-slate-900">Browse and Use HeyGen Avatars</h2>
                        <p className="mt-2 text-sm text-slate-600">
                            Explore the locally synced public catalog and your completed avatars without waiting on HeyGen.
                        </p>
                        {publicAvatarLastSyncedAt ? (
                            <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                                Public catalog synced {formatDateTime(publicAvatarLastSyncedAt)}
                            </p>
                        ) : null}
                    </div>

                    <button type="button" onClick={() => void Promise.all([loadPublicAvatars(), loadDigitalTwins()])} className="btn-secondary">
                        Refresh
                    </button>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <label className="relative block">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M21 21L16.65 16.65M18 10.5C18 14.6421 14.6421 18 10.5 18C6.35786 18 3 14.6421 3 10.5C3 6.35786 6.35786 3 10.5 3C14.6421 3 18 6.35786 18 10.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            </svg>
                        </span>
                        <input
                            type="search"
                            className="text-field !pl-10"
                            placeholder="Search avatars by name, ID, or style..."
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                        />
                    </label>

                    <div className="inline-flex rounded-xl border border-slate-200/90 bg-slate-50 p-1">
                        <button
                            type="button"
                            onClick={() => setActiveTab('my')}
                            className={activeTab === 'my'
                                ? 'rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm'
                                : 'rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800'}
                        >
                            My Avatars ({counts.my})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('public')}
                            className={activeTab === 'public'
                                ? 'rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm'
                                : 'rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800'}
                        >
                            Public Avatars ({counts.public})
                        </button>
                    </div>
                </div>

                {availableCategories.length > 1 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {availableCategories.map((category) => (
                            <button
                                key={category}
                                type="button"
                                onClick={() => setActiveCategory(category)}
                                className={activeCategory === category
                                    ? 'rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700'
                                    : 'rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900'}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                ) : null}

                <div className="mt-5 space-y-3">
                    {error && <FormNotice tone="error">{error}</FormNotice>}
                </div>

                {loading ? (
                    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {Array.from({ length: 8 }).map((_, index) => (
                            <div
                                key={`avatar-skeleton-${index}`}
                                className="aspect-[3/4] animate-pulse rounded-2xl border border-slate-200/90 bg-slate-100"
                            />
                        ))}
                    </div>
                ) : displayAvatars.length === 0 ? (
                    <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-6 py-10 text-center">
                        <p className="text-sm font-semibold text-slate-900">No avatars found</p>
                        <p className="mt-1 text-sm text-slate-600">
                            Try changing the tab, clearing filters, or create one with HeyGen below.
                        </p>
                    </div>
                ) : (
                    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {displayAvatars.map((avatar) => (
                            <article key={avatar.id} className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-100 shadow-sm">
                                <div className="relative aspect-[3/4]">
                                    {avatar.previewUrl ? (
                                        <img
                                            src={avatar.previewUrl}
                                            alt={avatar.name}
                                            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,#cbd5e1_0%,#e2e8f0_45%,#f1f5f9_100%)]">
                                            <span className="rounded-xl bg-white/70 px-4 py-3 text-lg font-extrabold tracking-[0.08em] text-slate-700">
                                                {resolveInitials(avatar.name)}
                                            </span>
                                        </div>
                                    )}

                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/84 via-slate-900/28 to-transparent p-4 text-white">
                                        <p className="text-base font-semibold">{avatar.name}</p>
                                        <p className="mt-1 font-mono text-[11px] text-slate-200/95">{avatar.id}</p>
                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                            {avatar.looks !== null ? (
                                                <span className="rounded-full bg-white/18 px-2 py-1 text-[11px] font-semibold">
                                                    {avatar.looks} looks
                                                </span>
                                            ) : null}
                                            {avatar.categories.slice(0, 2).map((category) => (
                                                <span key={`${avatar.id}-${category}`} className="rounded-full bg-white/18 px-2 py-1 text-[11px] font-semibold">
                                                    {category}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}

                {activeTab === 'public' && publicAvatarTotal > pageSize ? (
                    <div className="mt-5 flex flex-col gap-3 border-t border-slate-200/90 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-slate-600">
                            Showing <span className="font-semibold text-slate-900">{pageStart}</span>-
                            <span className="font-semibold text-slate-900">{pageEnd}</span> of{' '}
                            <span className="font-semibold text-slate-900">{publicAvatarTotal}</span> public avatars
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
                            <span className="px-1 text-sm font-semibold text-slate-700">
                                Page {currentPage} / {totalPages}
                            </span>
                            <button
                                type="button"
                                className="btn-secondary !min-h-9 !rounded-lg !px-3 !py-1.5 !text-sm"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                ) : null}
            </article>

            <article className="surface-card page-enter stagger-1 p-6 sm:p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Create Avatar</p>
                <h3 className="mt-1 text-2xl text-slate-900">Create Your First Avatar</h3>
                <p className="mt-2 text-sm text-slate-600">
                    This form submits Digital Twin requests directly from your app. HeyGen Enterprise access is still required on the provider side.
                </p>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                    <article className="rounded-2xl border border-slate-200/90 bg-[linear-gradient(145deg,#f8fafc_0%,#e2e8f0_100%)] p-5">
                        <h4 className="text-lg font-semibold text-slate-900">Clone a real person (In-App)</h4>
                        <p className="mt-2 text-sm text-slate-600">
                            Upload training and consent MP4 files, then submit to the backend Digital Twin pipeline.
                        </p>

                        <form className="mt-4 grid gap-4" onSubmit={handleDigitalTwinSubmit}>
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
                                <p className="mt-1 text-xs text-slate-500">Use a clear frontal face video, 30+ seconds recommended.</p>
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
                                <p className="mt-1 text-xs text-slate-500">Consent clip must satisfy HeyGen identity and permission policy.</p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <button type="submit" className="btn-primary" disabled={!canSubmitDigitalTwin}>
                                    {submittingTwin ? 'Submitting...' : 'Submit Digital Twin'}
                                </button>
                                <a className="btn-secondary" href={DIGITAL_TWIN_DOC_URL} target="_blank" rel="noreferrer">
                                    API Docs
                                </a>
                                <a className="btn-secondary" href={HEYGEN_STUDIO_AVATARS_URL} target="_blank" rel="noreferrer">
                                    Open Studio
                                </a>
                            </div>
                        </form>

                        <div className="mt-4 space-y-3">
                            {digitalTwinNotice && <FormNotice tone="success">{digitalTwinNotice}</FormNotice>}
                            {digitalTwinError && <FormNotice tone="error">{digitalTwinError}</FormNotice>}
                        </div>

                        <div className="mt-4 rounded-xl border border-slate-200/90 bg-white/85 px-4 py-3 text-sm text-slate-600">
                            <p>Remaining digital twin requests today: <span className="font-semibold text-slate-900">{digitalTwinQuotaRemaining ?? 'Unknown'}</span></p>
                        </div>
                    </article>

                    <article className="rounded-2xl border border-slate-200/90 bg-[linear-gradient(145deg,#f0f9ff_0%,#dbeafe_100%)] p-5">
                        <h4 className="text-lg font-semibold text-slate-900">Create a virtual character</h4>
                        <p className="mt-2 text-sm text-slate-600">
                            Use HeyGen Photo Avatar APIs to generate and train a custom avatar from image prompts.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <a className="btn-secondary" href={PHOTO_AVATAR_DOC_URL} target="_blank" rel="noreferrer">
                                Photo Avatar Docs
                            </a>
                            <button type="button" className="btn-secondary" onClick={() => void loadPublicAvatars()}>
                                Refresh avatar catalog
                            </button>
                        </div>
                    </article>
                </div>

                <div className="mt-6">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <h4 className="text-lg font-semibold text-slate-900">Digital Twin Requests</h4>
                        <button
                            type="button"
                            className="btn-secondary !min-h-9 !rounded-lg !px-3 !py-1.5 !text-sm"
                            onClick={() => void loadDigitalTwins()}
                        >
                            Refresh
                        </button>
                    </div>

                    {digitalTwinLoading ? (
                        <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 px-4 py-6 text-sm text-slate-600">
                            Loading digital twin requests...
                        </div>
                    ) : digitalTwins.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-6 text-sm text-slate-600">
                            No digital twin requests yet.
                        </div>
                    ) : (
                        <div className="grid gap-3 lg:grid-cols-2">
                            {digitalTwins.map((request) => (
                                <article key={request.id} className="rounded-xl border border-slate-200/90 bg-white/90 px-4 py-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-base font-semibold text-slate-900">{request.avatar_name}</p>
                                        <span className={resolveDigitalTwinBadgeClass(request.status)}>{request.status}</span>
                                    </div>

                                    <p className="mt-1 font-mono text-xs text-slate-500">Request #{request.id}</p>
                                    <p className="mt-2 text-sm text-slate-600">
                                        Provider Avatar ID: <span className="font-mono text-xs text-slate-700">{request.provider_avatar_id ?? 'pending'}</span>
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">Submitted: {formatDateTime(request.submitted_at)}</p>
                                    <p className="mt-1 text-xs text-slate-500">Updated: {formatDateTime(request.updated_at)}</p>

                                    {request.error_message ? (
                                        <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{request.error_message}</p>
                                    ) : null}

                                    <div className="mt-3 flex flex-wrap items-center gap-2">
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
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </article>
        </section>
    );
}
