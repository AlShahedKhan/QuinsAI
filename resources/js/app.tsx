import './bootstrap';
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../css/app.css';
import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, isEmailVerified, useAuth } from './auth/AuthContext';
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
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';
import type { VideoJobDto } from './types/heygen';

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
    const { state, logout } = useAuth();

    return (
        <main className="min-h-screen bg-slate-100">
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                    <div>
                        <h1 className="text-lg font-semibold text-slate-900">QuinsAI HeyGen Console</h1>
                        <p className="text-xs text-slate-500">{state.user?.email}</p>
                    </div>

                    <div className="flex items-center gap-3">
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

                        <button
                            type="button"
                            onClick={() => {
                                void logout();
                            }}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8">{children}</div>
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
        if (state.status === 'authenticated' && isEmailVerified(state.user)) {
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
                path="/verify-email"
                element={(
                    <ProtectedRoute requireVerified={false}>
                        <VerifyEmailPage />
                    </ProtectedRoute>
                )}
            />

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
