import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { isEmailVerified, useAuth } from './AuthContext';

type Props = {
    children: ReactElement;
    requireVerified?: boolean;
};

export function ProtectedRoute({ children, requireVerified = true }: Props) {
    const { state } = useAuth();

    if (state.status === 'loading') {
        return (
            <main className="grid min-h-screen place-items-center bg-slate-100 text-slate-700">
                Checking your session...
            </main>
        );
    }

    if (state.status !== 'authenticated' || state.user === null) {
        return <Navigate to="/login" replace />;
    }

    if (requireVerified && !isEmailVerified(state.user)) {
        return <Navigate to="/verify-email" replace />;
    }

    return children;
}
