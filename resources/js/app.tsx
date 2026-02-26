import './bootstrap';
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../css/app.css';
import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { PublicOnlyRoute } from './auth/PublicOnlyRoute';
import { heygenApi } from './lib/heygenApi';
import { useVideoPolling } from './hooks/useVideoPolling';
import { VideoGeneratorPage } from './pages/VideoGeneratorPage';
import { VideoHistoryPage } from './pages/VideoHistoryPage';
import { LiveAvatarPage } from './pages/LiveAvatarPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import type { VideoJobDto } from './types/heygen';

const navItems = [
    { to: '/videos/generate', label: 'Generate' },
    { to: '/videos', label: 'History' },
    { to: '/live', label: 'Live Avatar' },
] as const;

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
    const { state, logout } = useAuth();

    return (
        <main className="app-shell">
            <div className="mesh-orb mesh-orb-one" />
            <div className="mesh-orb mesh-orb-two" />
            <div className="mesh-orb mesh-orb-three" />

            <header className="glass-header">
                <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">QuinsAI Platform</p>
                        <h1 className="mt-1 text-2xl text-slate-900">HeyGen Operations Hub</h1>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <nav className="flex items-center rounded-2xl border border-slate-200/90 bg-white/70 p-1 text-sm backdrop-blur">
                            {navItems.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    className={({ isActive }) => (
                                        `rounded-xl px-4 py-2 font-semibold transition ${isActive
                                            ? 'bg-slate-900 text-white shadow-[0_12px_22px_-12px_rgba(15,23,42,0.9)]'
                                            : 'text-slate-600 hover:bg-white hover:text-slate-900'
                                        }`
                                    )}
                                >
                                    {item.label}
                                </NavLink>
                            ))}
                        </nav>

                        <div className="flex items-center gap-3">
                            <div className="rounded-xl border border-slate-200/90 bg-white/70 px-3 py-2 text-right backdrop-blur">
                                <p className="text-sm font-semibold text-slate-900">{state.user?.name ?? 'User'}</p>
                                <p className="text-xs text-slate-500">{state.user?.email}</p>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    void logout();
                                }}
                                className="btn-secondary"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <section className="relative z-10 mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 sm:py-8">
                {children}
            </section>
        </main>
    );
}

function AppRouter() {
    const { state } = useAuth();
    const [jobs, setJobs] = React.useState<VideoJobDto[]>([]);
    const [loadingJobs, setLoadingJobs] = React.useState(false);
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
        if (state.status === 'authenticated') {
            void loadJobs();
            return;
        }

        setJobs([]);
        setJobsError(null);
    }, [loadJobs, state]);

    useVideoPolling(jobs, loadJobs);

    async function handleVideoCreated(video: VideoJobDto): Promise<void> {
        setJobs((prev) => [video, ...prev]);
        await loadJobs();
    }

    return (
        <Routes>
            <Route path="/" element={<Navigate to="/videos/generate" replace />} />

            <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
            <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
            <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPasswordPage /></PublicOnlyRoute>} />
            <Route path="/reset-password/:token" element={<PublicOnlyRoute><ResetPasswordPage /></PublicOnlyRoute>} />

            <Route
                path="/videos/generate"
                element={(
                    <ProtectedRoute>
                        <AuthenticatedLayout>
                            <VideoGeneratorPage onVideoCreated={handleVideoCreated} />
                        </AuthenticatedLayout>
                    </ProtectedRoute>
                )}
            />
            <Route
                path="/videos"
                element={(
                    <ProtectedRoute>
                        <AuthenticatedLayout>
                            <VideoHistoryPage jobs={jobs} loading={loadingJobs} error={jobsError} onRefresh={loadJobs} />
                        </AuthenticatedLayout>
                    </ProtectedRoute>
                )}
            />
            <Route
                path="/live"
                element={(
                    <ProtectedRoute>
                        <AuthenticatedLayout>
                            <LiveAvatarPage />
                        </AuthenticatedLayout>
                    </ProtectedRoute>
                )}
            />

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRouter />
            </AuthProvider>
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
    </React.StrictMode>
);
