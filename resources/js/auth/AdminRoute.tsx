import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { canAccessAdmin, getAdminLandingPath, hasPermission, useAuth } from './AuthContext';
import { SessionLoadingScreen } from '../components/ui/SessionLoadingScreen';

type Props = {
    children: ReactElement;
    requiredPermission?: string;
};

export function AdminRoute({ children, requiredPermission }: Props) {
    const { state } = useAuth();

    if (state.status === 'loading') {
        return <SessionLoadingScreen />;
    }

    if (state.status !== 'authenticated' || state.user === null) {
        return <Navigate to="/admin/login" replace />;
    }

    if (!canAccessAdmin(state.user)) {
        return <Navigate to="/videos/generate" replace />;
    }

    if (requiredPermission && !hasPermission(state.user, requiredPermission)) {
        return <Navigate to={getAdminLandingPath(state.user) ?? '/videos/generate'} replace />;
    }

    return children;
}
