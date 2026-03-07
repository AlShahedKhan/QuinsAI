import { useEffect } from 'react';
import { FormNotice } from '../ui/FormNotice';
import type { PublicAvatarDetailDto } from '../../types/heygen';

type BaseAvatar = {
    id: string;
    name: string;
    previewUrl: string | null;
    previewVideoUrl: string | null;
    categories: string[];
    looks: number | null;
};

type Props = {
    avatar: BaseAvatar;
    details: PublicAvatarDetailDto | null;
    loading: boolean;
    error: string | null;
    onClose: () => void;
    onUseForVideo: () => void;
    onUseForLive: () => void;
};

function resolveDisplayName(avatar: BaseAvatar, details: PublicAvatarDetailDto | null): string {
    return details?.display_name || details?.name || avatar.name;
}

export function PublicAvatarDetailsModal({
    avatar,
    details,
    loading,
    error,
    onClose,
    onUseForVideo,
    onUseForLive,
}: Props) {
    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                onClose();
            }
        }

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    const previewImageUrl = details?.preview_image_url ?? avatar.previewUrl;
    const previewVideoUrl = details?.preview_video_url ?? avatar.previewVideoUrl;
    const tags = details?.tags ?? [];
    const looks = details?.looks ?? [];
    const categories = avatar.categories;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/72 px-4 py-6 backdrop-blur sm:py-10" onClick={onClose}>
            <div
                className="w-full max-w-5xl rounded-[28px] border border-slate-200/90 bg-white shadow-[0_40px_120px_-40px_rgba(15,23,42,0.45)]"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-slate-200/90 px-5 py-4 sm:px-7">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Avatar Details</p>
                        <h3 className="mt-1 text-xl text-slate-900">{resolveDisplayName(avatar, details)}</h3>
                    </div>

                    <button type="button" onClick={onClose} className="btn-secondary !min-h-10 !rounded-xl !px-3">
                        Close
                    </button>
                </div>

                <div className="grid gap-6 px-5 py-5 sm:px-7 sm:py-6 xl:grid-cols-[0.95fr_1.05fr]">
                    <section className="space-y-4">
                        <div className="overflow-hidden rounded-[24px] border border-slate-200/90 bg-slate-100">
                            <div className="relative aspect-[4/5] w-full">
                                {previewVideoUrl ? (
                                    <video
                                        className="h-full w-full object-cover"
                                        src={previewVideoUrl}
                                        autoPlay
                                        muted
                                        loop
                                        playsInline
                                        controls
                                        preload="metadata"
                                        poster={previewImageUrl ?? undefined}
                                    />
                                ) : previewImageUrl ? (
                                    <img src={previewImageUrl} alt={resolveDisplayName(avatar, details)} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,#cbd5e1_0%,#e2e8f0_45%,#f8fafc_100%)] text-2xl font-semibold text-slate-700">
                                        {resolveDisplayName(avatar, details)}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button type="button" className="btn-primary" onClick={onUseForVideo}>
                                Use For Video
                            </button>
                            <button type="button" className="btn-secondary" onClick={onUseForLive}>
                                Use For Live
                            </button>
                        </div>

                        {details?.details_notice ? <FormNotice tone="info">{details.details_notice}</FormNotice> : null}
                        {error ? <FormNotice tone="error">{error}</FormNotice> : null}
                    </section>

                    <section className="space-y-5">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 px-4 py-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Avatar ID</p>
                                <p className="mt-2 font-mono text-xs text-slate-700">{details?.avatar_id ?? avatar.id}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 px-4 py-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Default Voice</p>
                                <p className="mt-2 font-mono text-xs text-slate-700">{details?.default_voice_id ?? 'Not exposed'}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 px-4 py-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Gender</p>
                                <p className="mt-2 text-sm font-semibold text-slate-900">{details?.gender ?? 'Unknown'}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 px-4 py-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Premium</p>
                                <p className="mt-2 text-sm font-semibold text-slate-900">{details?.premium ? 'Yes' : 'No'}</p>
                            </div>
                        </div>

                        {categories.length > 0 ? (
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Categories</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {categories.map((category) => (
                                        <span key={category} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                                            {category}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {tags.length > 0 ? (
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Tags</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {tags.map((tag) => (
                                        <span key={tag} className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        <div className="rounded-2xl border border-slate-200/90 bg-white px-4 py-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Looks</p>
                                    <p className="mt-1 text-sm text-slate-600">
                                        {loading
                                            ? 'Checking provider details for look variants...'
                                            : details?.looks_available
                                                ? `${looks.length} look variants exposed by the API.`
                                                : details?.looks_note ?? 'No separate looks exposed by the current public avatar API.'}
                                    </p>
                                </div>
                                {avatar.looks !== null ? (
                                    <span className="status-badge status-default">{avatar.looks} looks</span>
                                ) : null}
                            </div>

                            {details?.looks_available ? (
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    {looks.map((look) => (
                                        <article key={look.id} className="overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50/80">
                                            <div className="relative aspect-[4/3]">
                                                {look.preview_image_url ? (
                                                    <img src={look.preview_image_url} alt={look.name} className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="grid h-full w-full place-items-center bg-slate-100 text-sm font-semibold text-slate-600">
                                                        {look.name}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="px-3 py-3">
                                                <p className="text-sm font-semibold text-slate-900">{look.name}</p>
                                                <p className="mt-1 font-mono text-[11px] text-slate-500">{look.id}</p>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
