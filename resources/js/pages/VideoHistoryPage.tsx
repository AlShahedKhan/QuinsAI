import type { VideoJobDto } from '../types/heygen';

type Props = {
    jobs: VideoJobDto[];
    loading: boolean;
    error: string | null;
    onRefresh: () => Promise<void>;
};

function statusClass(status: VideoJobDto['status']): string {
    switch (status) {
        case 'completed':
            return 'bg-emerald-100 text-emerald-800';
        case 'failed':
            return 'bg-rose-100 text-rose-800';
        default:
            return 'bg-amber-100 text-amber-800';
    }
}

export function VideoHistoryPage({ jobs, loading, error, onRefresh }: Props) {
    return (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Video History</h2>
                <button
                    type="button"
                    onClick={() => {
                        void onRefresh();
                    }}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700"
                >
                    Refresh
                </button>
            </div>

            {loading && <p className="text-sm text-slate-600">Loading video jobs...</p>}
            {error && <p className="text-sm text-rose-700">{error}</p>}

            {!loading && jobs.length === 0 && <p className="text-sm text-slate-600">No jobs yet.</p>}

            <div className="space-y-3">
                {jobs.map((job) => (
                    <article key={job.id} className="rounded-lg border border-slate-200 p-4">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900">Job #{job.id}</p>
                            <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass(job.status)}`}>
                                {job.status}
                            </span>
                        </div>

                        <p className="text-sm text-slate-700">
                            Avatar: <span className="font-mono">{job.avatar_id}</span> | Voice: <span className="font-mono">{job.voice_id}</span>
                        </p>
                        <p className="mt-2 line-clamp-2 text-sm text-slate-600">{job.script}</p>

                        {job.error_message && <p className="mt-2 text-sm text-rose-700">{job.error_message}</p>}

                        {job.output_storage_url && (
                            <a
                                className="mt-3 inline-block text-sm font-medium text-blue-700 underline"
                                href={job.output_storage_url}
                                target="_blank"
                                rel="noreferrer"
                            >
                                Open archived video
                            </a>
                        )}
                    </article>
                ))}
            </div>
        </section>
    );
}
