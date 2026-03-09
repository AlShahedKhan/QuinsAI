import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PublicAvatarDetailsModal } from '../components/avatars/PublicAvatarDetailsModal';
import { FormNotice } from '../components/ui/FormNotice';
import { heygenApi } from '../lib/heygenApi';
import type { CatalogItem, PublicAvatarDetailDto } from '../types/heygen';

type AvatarCard = {
    id: string;
    name: string;
    previewUrl: string | null;
    previewVideoUrl: string | null;
    looks: number | null;
    categories: string[];
};

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

function normalizeAvatar(item: CatalogItem): AvatarCard | null {
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
    const previewVideoUrl = readFirstString(raw, [
        'preview_video_url',
        'video_preview_url',
        'video_url',
    ]);

    return {
        id,
        name,
        previewUrl,
        previewVideoUrl,
        looks: readFirstNumber(raw, ['looks', 'looks_count', 'look_count']),
        categories: collectCategoryValues(raw, [
            'category',
            'categories',
            'avatar_type',
            'type',
            'style',
            'tags',
            'gender',
        ]),
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

export function AvatarsPage() {
    const navigate = useNavigate();
    const [avatars, setAvatars] = useState<AvatarCard[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [activeCategory, setActiveCategory] = useState('All');
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [lastPage, setLastPage] = useState(1);
    const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [previewingAvatarId, setPreviewingAvatarId] = useState<string | null>(null);
    const [selectedAvatar, setSelectedAvatar] = useState<AvatarCard | null>(null);
    const [selectedAvatarDetails, setSelectedAvatarDetails] = useState<PublicAvatarDetailDto | null>(null);
    const [selectedAvatarLoading, setSelectedAvatarLoading] = useState(false);
    const [selectedAvatarError, setSelectedAvatarError] = useState<string | null>(null);
    const previewDelayTimeoutRef = useRef<number | null>(null);

    const pageSize = 50;

    const loadAvatars = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await heygenApi.listPublicAvatars({
                page: currentPage,
                per_page: pageSize,
                search: debouncedQuery === '' ? undefined : debouncedQuery,
                category: activeCategory === 'All' ? undefined : activeCategory,
            });

            setAvatars(response.data
                .map((item) => normalizeAvatar(item))
                .filter((item): item is AvatarCard => item !== null));
            setCategories(response.meta.categories);
            setTotal(response.total);
            setLastPage(Math.max(1, response.last_page));
            setLastSyncedAt(response.meta.last_synced_at);
        } catch (err) {
            const normalizedError = err instanceof Error ? err : new Error('Failed to load avatars.');
            setError(normalizedError.message);
        } finally {
            setLoading(false);
        }
    }, [activeCategory, currentPage, debouncedQuery]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setDebouncedQuery(query.trim());
        }, 250);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [query]);

    useEffect(() => {
        setCurrentPage(1);
    }, [activeCategory, debouncedQuery]);

    useEffect(() => {
        void loadAvatars();
    }, [loadAvatars]);

    useEffect(() => {
        if (selectedAvatar === null) {
            setSelectedAvatarDetails(null);
            setSelectedAvatarError(null);
            setSelectedAvatarLoading(false);
            return;
        }

        let active = true;
        setSelectedAvatarLoading(true);
        setSelectedAvatarError(null);

        heygenApi.getPublicAvatarDetails(selectedAvatar.id)
            .then((details) => {
                if (active) {
                    setSelectedAvatarDetails(details);
                }
            })
            .catch((err: Error) => {
                if (active) {
                    setSelectedAvatarError(err.message);
                }
            })
            .finally(() => {
                if (active) {
                    setSelectedAvatarLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [selectedAvatar]);

    useEffect(() => {
        return () => {
            if (previewDelayTimeoutRef.current !== null) {
                window.clearTimeout(previewDelayTimeoutRef.current);
            }
        };
    }, []);

    const availableCategories = useMemo(() => ['All', ...categories], [categories]);
    const totalPages = Math.max(1, lastPage);
    const pageStart = total === 0 ? 0 : ((currentPage - 1) * pageSize) + 1;
    const pageEnd = total === 0 ? 0 : Math.min(currentPage * pageSize, total);

    useEffect(() => {
        if (!availableCategories.includes(activeCategory)) {
            setActiveCategory('All');
        }
    }, [activeCategory, availableCategories]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const clearPreviewDelay = useCallback(() => {
        if (previewDelayTimeoutRef.current === null) {
            return;
        }

        window.clearTimeout(previewDelayTimeoutRef.current);
        previewDelayTimeoutRef.current = null;
    }, []);

    const scheduleAvatarPreview = useCallback((avatarId: string, previewVideoUrl: string | null) => {
        clearPreviewDelay();

        if (!previewVideoUrl) {
            setPreviewingAvatarId(null);
            return;
        }

        previewDelayTimeoutRef.current = window.setTimeout(() => {
            setPreviewingAvatarId(avatarId);
            previewDelayTimeoutRef.current = null;
        }, 180);
    }, [clearPreviewDelay]);

    const stopAvatarPreview = useCallback((avatarId?: string) => {
        clearPreviewDelay();

        setPreviewingAvatarId((current) => {
            if (avatarId && current !== avatarId) {
                return current;
            }

            return null;
        });
    }, [clearPreviewDelay]);

    const openPublicAvatarModal = useCallback((avatar: AvatarCard) => {
        stopAvatarPreview();
        setSelectedAvatar(avatar);
    }, [stopAvatarPreview]);

    const closePublicAvatarModal = useCallback(() => {
        stopAvatarPreview();
        setSelectedAvatar(null);
        setSelectedAvatarDetails(null);
        setSelectedAvatarError(null);
    }, [stopAvatarPreview]);

    const navigateWithSelectedAvatar = useCallback((path: string) => {
        if (selectedAvatar === null) {
            return;
        }

        const params = new URLSearchParams({
            avatar_id: selectedAvatar.id,
        });

        if (selectedAvatarDetails?.default_voice_id) {
            params.set('voice_id', selectedAvatarDetails.default_voice_id);
        }

        navigate(`${path}?${params.toString()}`);
        closePublicAvatarModal();
    }, [closePublicAvatarModal, navigate, selectedAvatar, selectedAvatarDetails]);

    return (
        <>
            <section className="grid gap-6">
                <article className="surface-card page-enter p-6 sm:p-7">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-3xl">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Avatar Gallery</p>
                            <h2 className="mt-1 text-2xl text-slate-900">Browse and Use Public HeyGen Avatars</h2>
                            <p className="mt-2 text-sm text-slate-600">
                                Explore the synced public catalog, preview avatars on hover, and open details before sending them to video or live workflows.
                            </p>
                            <p className="mt-3 text-xs text-slate-500">
                                Last synced: <span className="font-medium text-slate-700">{formatDateTime(lastSyncedAt)}</span>
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Link to="/avatars/create" className="btn-primary">
                                Create Avatar
                            </Link>
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => void loadAvatars()}
                            >
                                Refresh
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                        <label className="block">
                            <span className="sr-only">Search public avatars</span>
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                className="text-field"
                                placeholder="Search avatars by name, ID, style, or category..."
                            />
                        </label>

                        <Link to="/avatars/create" className="btn-secondary">
                            My Avatar Requests
                        </Link>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                        {availableCategories.map((category) => (
                            <button
                                key={category}
                                type="button"
                                className={category === activeCategory ? 'btn-primary !min-h-10 !rounded-full !px-4 !py-2 !text-sm' : 'btn-secondary !min-h-10 !rounded-full !px-4 !py-2 !text-sm'}
                                onClick={() => setActiveCategory(category)}
                            >
                                {category}
                            </button>
                        ))}
                    </div>

                    {error ? (
                        <div className="mt-5">
                            <FormNotice tone="error">{error}</FormNotice>
                        </div>
                    ) : null}

                    {loading ? (
                        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                            {Array.from({ length: 8 }).map((_, index) => (
                                <div
                                    key={`avatar-skeleton-${index}`}
                                    className="aspect-[3/4] animate-pulse rounded-2xl border border-slate-200/90 bg-slate-100"
                                />
                            ))}
                        </div>
                    ) : avatars.length === 0 ? (
                        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-6 py-10 text-center">
                            <p className="text-sm font-semibold text-slate-900">No public avatars found</p>
                            <p className="mt-1 text-sm text-slate-600">
                                Try clearing your filters, refreshing the catalog, or create a private avatar for your own workspace.
                            </p>
                            <div className="mt-4">
                                <Link to="/avatars/create" className="btn-primary">
                                    Create Avatar
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                            {avatars.map((avatar) => {
                                const isPreviewing = previewingAvatarId === avatar.id && avatar.previewVideoUrl !== null;

                                return (
                                    <article
                                        key={avatar.id}
                                        tabIndex={0}
                                        className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-100 shadow-sm"
                                        onMouseEnter={() => scheduleAvatarPreview(avatar.id, avatar.previewVideoUrl)}
                                        onMouseLeave={() => stopAvatarPreview(avatar.id)}
                                        onFocus={() => scheduleAvatarPreview(avatar.id, avatar.previewVideoUrl)}
                                        onBlur={() => stopAvatarPreview(avatar.id)}
                                        onClick={() => openPublicAvatarModal(avatar)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                openPublicAvatarModal(avatar);
                                            }
                                        }}
                                    >
                                        <div className="relative aspect-[3/4]">
                                            {avatar.previewUrl ? (
                                                <img
                                                    src={avatar.previewUrl}
                                                    alt={avatar.name}
                                                    className={isPreviewing
                                                        ? 'h-full w-full object-cover opacity-0 transition duration-200'
                                                        : 'h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]'}
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,#cbd5e1_0%,#e2e8f0_45%,#f1f5f9_100%)]">
                                                    <span className="rounded-xl bg-white/70 px-4 py-3 text-lg font-extrabold tracking-[0.08em] text-slate-700">
                                                        {resolveInitials(avatar.name)}
                                                    </span>
                                                </div>
                                            )}

                                            {isPreviewing ? (
                                                <video
                                                    key={`${avatar.id}-preview`}
                                                    className="absolute inset-0 h-full w-full object-cover"
                                                    src={avatar.previewVideoUrl ?? undefined}
                                                    autoPlay
                                                    muted
                                                    loop
                                                    playsInline
                                                    preload="none"
                                                    poster={avatar.previewUrl ?? undefined}
                                                />
                                            ) : null}

                                            {avatar.previewVideoUrl ? (
                                                <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-slate-950/62 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                                                    {isPreviewing ? 'Previewing' : 'Hover to preview'}
                                                </div>
                                            ) : null}

                                            <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/84 px-2.5 py-1 text-[11px] font-semibold text-slate-900 backdrop-blur">
                                                Open details
                                            </div>

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
                                );
                            })}
                        </div>
                    )}

                    {total > pageSize ? (
                        <div className="mt-5 flex flex-col gap-3 border-t border-slate-200/90 pt-4 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-slate-600">
                                Showing <span className="font-semibold text-slate-900">{pageStart}</span>-
                                <span className="font-semibold text-slate-900">{pageEnd}</span> of{' '}
                                <span className="font-semibold text-slate-900">{total}</span> public avatars
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

                <article className="surface-card page-enter stagger-1 grid gap-5 p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-7">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Private Avatars</p>
                        <h3 className="mt-1 text-xl text-slate-900">Need your own trained avatar?</h3>
                        <p className="mt-2 text-sm text-slate-600">
                            Create digital twin requests in a dedicated workspace. That keeps the public gallery fast while still giving users a clear place to manage training uploads and request status.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Link to="/avatars/create" className="btn-primary">
                            Open Create Avatar
                        </Link>
                        <Link to="/videos/generate" className="btn-secondary">
                            Go to Generate
                        </Link>
                    </div>
                </article>
            </section>

            {selectedAvatar ? (
                <PublicAvatarDetailsModal
                    avatar={selectedAvatar}
                    details={selectedAvatarDetails}
                    loading={selectedAvatarLoading}
                    error={selectedAvatarError}
                    onClose={closePublicAvatarModal}
                    onUseForVideo={() => navigateWithSelectedAvatar('/videos/generate')}
                    onUseForLive={() => navigateWithSelectedAvatar('/live')}
                />
            ) : null}
        </>
    );
}
