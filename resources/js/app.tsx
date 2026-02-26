import './bootstrap';
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../css/app.css';
import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { heygenApi } from './lib/heygenApi';
import { useVideoPolling } from './hooks/useVideoPolling';
import { VideoGeneratorPage } from './pages/VideoGeneratorPage';
import { VideoHistoryPage } from './pages/VideoHistoryPage';
import { LiveAvatarPage } from './pages/LiveAvatarPage';
import type { VideoJobDto } from './types/heygen';

function App() {
    const [jobs, setJobs] = React.useState<VideoJobDto[]>([]);
    const [loadingJobs, setLoadingJobs] = React.useState(true);
    const [jobsError, setJobsError] = React.useState<string | null>(null);

    const loadJobs = React.useCallback(async () => {
        setLoadingJobs(true);
        setJobsError(null);

        try {
            const response = await heygenApi.listVideos();
            setJobs(response.data);
        } catch (error) {
            const normalized = error instanceof Error ? error : new Error('Failed to load video jobs.');
            setJobsError(normalized.message);
        } finally {
            setLoadingJobs(false);
        }
    }, []);

    React.useEffect(() => {
        void loadJobs();
    }, [loadJobs]);

    useVideoPolling(jobs, loadJobs);

    async function handleVideoCreated(video: VideoJobDto): Promise<void> {
        setJobs((prev) => [video, ...prev]);
        await loadJobs();
    }

    return (
        <BrowserRouter>
            <main className="min-h-screen bg-slate-100">
                <header className="border-b border-slate-200 bg-white">
                    <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                        <h1 className="text-lg font-semibold text-slate-900">QuinsAI HeyGen Console</h1>
                        <nav className="flex items-center gap-2 text-sm">
                            <NavLink
                                to="/videos/generate"
                                className={({ isActive }) => `rounded-lg px-3 py-2 ${isActive ? 'bg-slate-900 text-white' : 'text-slate-700'}`}
                            >
                                Generator
                            </NavLink>
                            <NavLink
                                to="/videos"
                                className={({ isActive }) => `rounded-lg px-3 py-2 ${isActive ? 'bg-slate-900 text-white' : 'text-slate-700'}`}
                            >
                                History
                            </NavLink>
                            <NavLink
                                to="/live"
                                className={({ isActive }) => `rounded-lg px-3 py-2 ${isActive ? 'bg-slate-900 text-white' : 'text-slate-700'}`}
                            >
                                Live Avatar
                            </NavLink>
                        </nav>
                    </div>
                </header>

                <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8">
                    <Routes>
                        <Route path="/" element={<Navigate to="/videos/generate" replace />} />
                        <Route
                            path="/videos/generate"
                            element={<VideoGeneratorPage onVideoCreated={handleVideoCreated} />}
                        />
                        <Route
                            path="/videos"
                            element={<VideoHistoryPage jobs={jobs} loading={loadingJobs} error={jobsError} onRefresh={loadJobs} />}
                        />
                        <Route path="/live" element={<LiveAvatarPage />} />
                    </Routes>
                </div>
            </main>
        </BrowserRouter>
    );
}

const rootElement = document.getElementById('app');

if (!rootElement) {
    throw new Error('Missing #app root element');
}

createRoot(rootElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
