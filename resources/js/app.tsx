import './bootstrap';
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../css/app.css';
import { BrowserRouter, Link, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, canAccessAdmin, getAdminLandingPath, getDefaultAuthenticatedPath, hasPermission, useAuth } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { PublicOnlyRoute } from './auth/PublicOnlyRoute';
import { AdminRoute } from './auth/AdminRoute';
import { VideoGeneratorPage } from './pages/VideoGeneratorPage';
import { VideoAgentPage } from './pages/VideoAgentPage';
import { VideoHistoryPage } from './pages/VideoHistoryPage';
import { LiveAvatarPage } from './pages/LiveAvatarPage';
import { AvatarsPage } from './pages/AvatarsPage';
import { AvatarCreatePage } from './pages/AvatarCreatePage';
import { LoginPage } from './pages/auth/LoginPage';
import { AdminLoginPage } from './pages/auth/AdminLoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { PublicAvatarCatalogAdminPage } from './pages/admin/PublicAvatarCatalogAdminPage';
import { RolesAdminPage } from './pages/admin/RolesAdminPage';
import { PermissionsAdminPage } from './pages/admin/PermissionsAdminPage';
import type { AuthUserDto } from './types/heygen';

const userNavGroups = [
    {
        label: 'Workspace',
        items: [
            { to: '/avatars', label: 'Avatars' },
            { to: '/avatars/create', label: 'Create Avatar' },
            { to: '/videos/generate', label: 'Generate' },
            { to: '/videos', label: 'History' },
            { to: '/live', label: 'Live Avatar' },
        ],
    },
] as const;

const adminOpsItems = [
    { to: '/admin/avatar-catalog', label: 'Avatar Catalog' },
    { to: '/admin/video-agent', label: 'Video Agent' },
] as const;

const legacyVideoAgentPath = '/video-agent';

type NavLinkItem = { to: string; label: string };
type NavGroup = { label: string; items: NavLinkItem[] };

type ShellLayoutProps = {
    children: React.ReactNode;
    eyebrow: string;
    title: string;
    navGroups: NavGroup[];
    contextLink?: {
        to: string;
        label: string;
    };
};

function resolveHomePath(user: AuthUserDto | null): string {
    return getDefaultAuthenticatedPath(user);
}

function buildAdminNavGroups(user: AuthUserDto | null): NavGroup[] {
    const groups: NavGroup[] = [];
    const securityItems: NavLinkItem[] = [];

    if (canAccessAdmin(user)) {
        groups.push({
            label: 'Operations',
            items: [...adminOpsItems],
        });
    }

    if (hasPermission(user, 'roles.view')) {
        securityItems.push({ to: '/admin/roles', label: 'Roles' });
    }

    if (hasPermission(user, 'permissions.view')) {
        securityItems.push({ to: '/admin/permissions', label: 'Permissions' });
    }

    if (securityItems.length > 0) {
        groups.push({
            label: 'Users & Roles',
            items: securityItems,
        });
    }

    return groups;
}

function ShellLayout({ children, eyebrow, title, navGroups, contextLink }: ShellLayoutProps) {
    const { state, logout } = useAuth();

    return (
        <main className="app-shell">
            <div className="mesh-orb mesh-orb-one" />
            <div className="mesh-orb mesh-orb-two" />
            <div className="mesh-orb mesh-orb-three" />

            <header className="glass-header">
                <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">{eyebrow}</p>
                        <h1 className="mt-1 text-2xl text-slate-900">{title}</h1>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                        {contextLink ? (
                            <Link to={contextLink.to} className="btn-ghost">
                                {contextLink.label}
                            </Link>
                        ) : null}

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
            </header>

            <section className="relative z-10 mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
                <aside className="rounded-3xl border border-slate-200/90 bg-white/80 p-4 shadow-sm backdrop-blur lg:sticky lg:top-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Navigation</p>

                    {navGroups.map((group) => (
                        <div key={group.label} className="mt-4 rounded-2xl border border-slate-200/90 bg-slate-50/80 p-3">
                            <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                                {group.label}
                            </p>

                            <div className="flex flex-col gap-1">
                                {group.items.map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        end
                                        className={({ isActive }) => (
                                            `rounded-lg px-3 py-2 text-sm font-semibold transition ${isActive
                                                ? 'bg-slate-900 text-white shadow-[0_12px_22px_-12px_rgba(15,23,42,0.9)]'
                                                : 'text-slate-600 hover:bg-white hover:text-slate-900'
                                            }`
                                        )}
                                    >
                                        {item.label}
                                    </NavLink>
                                ))}
                            </div>
                        </div>
                    ))}
                </aside>

                <div className="min-w-0">
                    {children}
                </div>
            </section>
        </main>
    );
}

function UserLayout({ children }: { children: React.ReactNode }) {
    return (
        <ShellLayout
            eyebrow="QuinsAI Workspace"
            title="User Workspace"
            navGroups={userNavGroups.map((group) => ({
                label: group.label,
                items: [...group.items],
            }))}
        >
            {children}
        </ShellLayout>
    );
}

function AdminLayout({ children }: { children: React.ReactNode }) {
    const { state } = useAuth();

    return (
        <ShellLayout
            eyebrow="QuinsAI Administration"
            title="Admin Console"
            navGroups={buildAdminNavGroups(state.user)}
            contextLink={{ to: '/videos/generate', label: 'Open User App' }}
        >
            {children}
        </ShellLayout>
    );
}

function AppRouter() {
    const { state } = useAuth();

    const defaultHome = resolveHomePath(state.user);
    const legacyVideoAgentRedirect = canAccessAdmin(state.user) ? '/admin/video-agent' : '/videos/generate';
    const adminHome = getAdminLandingPath(state.user) ?? '/admin/avatar-catalog';

    return (
        <Routes>
            <Route path="/" element={<Navigate to={defaultHome} replace />} />

            <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
            <Route path="/admin/login" element={<PublicOnlyRoute><AdminLoginPage /></PublicOnlyRoute>} />
            <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
            <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPasswordPage /></PublicOnlyRoute>} />
            <Route path="/reset-password/:token" element={<PublicOnlyRoute><ResetPasswordPage /></PublicOnlyRoute>} />

            <Route
                path="/avatars"
                element={(
                    <ProtectedRoute>
                        <UserLayout>
                            <AvatarsPage />
                        </UserLayout>
                    </ProtectedRoute>
                )}
            />
            <Route
                path="/avatars/create"
                element={(
                    <ProtectedRoute>
                        <UserLayout>
                            <AvatarCreatePage />
                        </UserLayout>
                    </ProtectedRoute>
                )}
            />
            <Route
                path="/videos/generate"
                element={(
                    <ProtectedRoute>
                        <UserLayout>
                            <VideoGeneratorPage />
                        </UserLayout>
                    </ProtectedRoute>
                )}
            />
            <Route
                path={legacyVideoAgentPath}
                element={(
                    <ProtectedRoute>
                        <Navigate to={legacyVideoAgentRedirect} replace />
                    </ProtectedRoute>
                )}
            />
            <Route
                path="/videos"
                element={(
                    <ProtectedRoute>
                        <UserLayout>
                            <VideoHistoryPage />
                        </UserLayout>
                    </ProtectedRoute>
                )}
            />
            <Route
                path="/live"
                element={(
                    <ProtectedRoute>
                        <UserLayout>
                            <LiveAvatarPage />
                        </UserLayout>
                    </ProtectedRoute>
                )}
            />

            <Route
                path="/admin"
                element={(
                    <AdminRoute>
                        <Navigate to={adminHome} replace />
                    </AdminRoute>
                )}
            />
            <Route
                path="/admin/avatar-catalog"
                element={(
                    <AdminRoute>
                        <AdminLayout>
                            <PublicAvatarCatalogAdminPage />
                        </AdminLayout>
                    </AdminRoute>
                )}
            />
            <Route
                path="/admin/video-agent"
                element={(
                    <AdminRoute>
                        <AdminLayout>
                            <VideoAgentPage />
                        </AdminLayout>
                    </AdminRoute>
                )}
            />
            <Route
                path="/admin/roles"
                element={(
                    <AdminRoute requiredPermission="roles.view">
                        <AdminLayout>
                            <RolesAdminPage />
                        </AdminLayout>
                    </AdminRoute>
                )}
            />
            <Route
                path="/admin/permissions"
                element={(
                    <AdminRoute requiredPermission="permissions.view">
                        <AdminLayout>
                            <PermissionsAdminPage />
                        </AdminLayout>
                    </AdminRoute>
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
