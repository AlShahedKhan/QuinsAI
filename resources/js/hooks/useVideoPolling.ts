import { useEffect, useMemo, useState } from 'react';

const ACTIVE_STATUSES = new Set(['queued', 'submitting', 'processing']);

type PollableJob = {
    status: string;
};

export function useVideoPolling<T extends PollableJob>(jobs: T[], onRefresh: () => Promise<void>): void {
    const [attempt, setAttempt] = useState(0);

    const hasActiveJobs = useMemo(
        () => jobs.some((job) => ACTIVE_STATUSES.has(job.status)),
        [jobs],
    );

    useEffect(() => {
        if (!hasActiveJobs) {
            setAttempt(0);
            return;
        }

        const delay = Math.min(30_000, 2_000 * (2 ** attempt));
        const timer = window.setTimeout(async () => {
            try {
                await onRefresh();
            } finally {
                setAttempt((current) => Math.min(current + 1, 4));
            }
        }, delay);

        return () => {
            window.clearTimeout(timer);
        };
    }, [attempt, hasActiveJobs, onRefresh]);
}
