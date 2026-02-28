import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { getAdminLandingPath, useAuth } from './AuthContext';
import { SessionLoadingScreen } from '../components/ui/SessionLoadingScreen';

type Props = {
    children: ReactElement;
};

export function PublicOnlyRoute({ children }: Props) {
    const { state } = useAuth();

    if (state.status === 'loading') {
        return <SessionLoadingScreen />;
    }

    if (state.status === 'authenticated' && state.user !== null) {
        return <Navigate to={getAdminLandingPath(state.user) ?? '/videos/generate'} replace />;
    }

    return children;
}
