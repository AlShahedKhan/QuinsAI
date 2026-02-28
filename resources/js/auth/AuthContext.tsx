import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../lib/authApi';
import { configureApiClientAuth } from '../lib/apiClient';
import type { AuthState, AuthTokenDto, AuthUserDto } from '../types/heygen';

type RegisterInput = {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
};

type LoginInput = {
    email: string;
    password: string;
};

type ResetPasswordInput = {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
};

type AuthContextValue = {
    state: AuthState;
    register: (payload: RegisterInput) => Promise<{ message: string }>;
    login: (payload: LoginInput) => Promise<AuthUserDto>;
    loginAdmin: (payload: LoginInput) => Promise<AuthUserDto>;
    logout: () => Promise<void>;
    logoutAll: () => Promise<void>;
    resendVerification: () => Promise<string>;
    forgotPassword: (email: string) => Promise<string>;
    resetPassword: (payload: ResetPasswordInput) => Promise<string>;
    refreshSilently: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function mapTokenToState(tokenData: AuthTokenDto): AuthState {
    return {
        status: 'authenticated',
        accessToken: tokenData.access_token,
        user: tokenData.user,
    };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<AuthState>({
        status: 'loading',
        accessToken: null,
        user: null,
    });

    const setUnauthenticated = useCallback(() => {
        setState({
            status: 'unauthenticated',
            accessToken: null,
            user: null,
        });
    }, []);

    const refreshSilently = useCallback(async (): Promise<string | null> => {
        try {
            const tokenData = await authApi.refresh();
            setState(mapTokenToState(tokenData));

            return tokenData.access_token;
        } catch {
            setUnauthenticated();
            return null;
        }
    }, [setUnauthenticated]);

    useEffect(() => {
        configureApiClientAuth({
            getAccessToken: () => state.accessToken,
            refreshAccessToken: refreshSilently,
            onAuthFailure: setUnauthenticated,
        });
    }, [state.accessToken, refreshSilently, setUnauthenticated]);

    useEffect(() => {
        void refreshSilently();
    }, [refreshSilently]);

    const register = useCallback(async (payload: RegisterInput): Promise<{ message: string }> => {
        const response = await authApi.register(payload);
        return { message: response.message };
    }, []);

    const login = useCallback(async (payload: LoginInput): Promise<AuthUserDto> => {
        const tokenData = await authApi.login(payload);
        setState(mapTokenToState(tokenData));
        return tokenData.user;
    }, []);

    const loginAdmin = useCallback(async (payload: LoginInput): Promise<AuthUserDto> => {
        const tokenData = await authApi.adminLogin(payload);
        setState(mapTokenToState(tokenData));
        return tokenData.user;
    }, []);

    const logout = useCallback(async (): Promise<void> => {
        const token = state.accessToken;
        try {
            if (token) {
                await authApi.logout(token);
            }
        } finally {
            setUnauthenticated();
        }
    }, [setUnauthenticated, state.accessToken]);

    const logoutAll = useCallback(async (): Promise<void> => {
        const token = state.accessToken;
        try {
            if (token) {
                await authApi.logoutAll(token);
            }
        } finally {
            setUnauthenticated();
        }
    }, [setUnauthenticated, state.accessToken]);

    const resendVerification = useCallback(async (): Promise<string> => {
        const token = state.accessToken;
        if (!token) {
            throw new Error('You must be logged in.');
        }

        return authApi.resendVerification(token);
    }, [state.accessToken]);

    const forgotPassword = useCallback(async (email: string): Promise<string> => {
        return authApi.forgotPassword({ email });
    }, []);

    const resetPassword = useCallback(async (payload: ResetPasswordInput): Promise<string> => {
        return authApi.resetPassword(payload);
    }, []);

    const value = useMemo<AuthContextValue>(() => ({
        state,
        register,
        login,
        loginAdmin,
        logout,
        logoutAll,
        resendVerification,
        forgotPassword,
        resetPassword,
        refreshSilently,
    }), [state, register, login, loginAdmin, logout, logoutAll, resendVerification, forgotPassword, resetPassword, refreshSilently]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);

    if (context === null) {
        throw new Error('useAuth must be used within AuthProvider.');
    }

    return context;
}

export function isEmailVerified(user: AuthUserDto | null): boolean {
    return user?.email_verified_at !== null && user?.email_verified_at !== undefined;
}

export function hasPermission(user: AuthUserDto | null, permission: string): boolean {
    return user?.permissions.includes(permission) ?? false;
}

export function canAccessAdmin(user: AuthUserDto | null): boolean {
    if (user === null) {
        return false;
    }

    if (user.is_admin || user.roles.includes('super-admin')) {
        return true;
    }

    return (
        hasPermission(user, 'roles.view')
        || hasPermission(user, 'permissions.view')
        || hasPermission(user, 'roles.create')
        || hasPermission(user, 'permissions.create')
        || hasPermission(user, 'roles.update')
        || hasPermission(user, 'permissions.update')
        || hasPermission(user, 'roles.delete')
        || hasPermission(user, 'permissions.delete')
    );
}

export function getAdminLandingPath(user: AuthUserDto | null): string | null {
    if (!canAccessAdmin(user)) {
        return null;
    }

    if (hasPermission(user, 'roles.view')) {
        return '/admin/roles';
    }

    if (hasPermission(user, 'permissions.view')) {
        return '/admin/permissions';
    }

    return '/videos/generate';
}
