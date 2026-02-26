import axios, { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import type { ApiErrorDto } from '../types/heygen';

type AuthHandlerConfig = {
    getAccessToken: () => string | null;
    refreshAccessToken: () => Promise<string | null>;
    onAuthFailure: () => void;
};

let authHandlers: AuthHandlerConfig = {
    getAccessToken: () => null,
    refreshAccessToken: async () => null,
    onAuthFailure: () => undefined,
};

type RetryRequestConfig = InternalAxiosRequestConfig & {
    _retry?: boolean;
};

const AUTH_ENDPOINTS = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
];

export const apiClient = axios.create({
    withCredentials: true,
    headers: {
        Accept: 'application/json',
    },
});

apiClient.interceptors.request.use((config) => {
    const token = authHandlers.getAccessToken();

    if (token && !AUTH_ENDPOINTS.some((path) => (config.url ?? '').includes(path))) {
        const headers = AxiosHeaders.from(config.headers);
        headers.set('Authorization', `Bearer ${token}`);
        config.headers = headers;
    }

    return config;
});

apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ApiErrorDto>) => {
        const status = error.response?.status;
        const config = error.config as RetryRequestConfig | undefined;
        const url = config?.url ?? '';
        const isAuthRequest = AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));

        if (status === 401 && config && !config._retry && !isAuthRequest) {
            config._retry = true;
            const refreshedToken = await authHandlers.refreshAccessToken();

            if (refreshedToken) {
                const headers = AxiosHeaders.from(config.headers);
                headers.set('Authorization', `Bearer ${refreshedToken}`);
                config.headers = headers;

                return apiClient(config);
            }

            authHandlers.onAuthFailure();
        }

        throw error;
    }
);

export function configureApiClientAuth(config: AuthHandlerConfig): void
{
    authHandlers = config;
}

export function toApiError(error: unknown): Error
{
    if (axios.isAxiosError(error)) {
        const data = (error as AxiosError<ApiErrorDto>).response?.data;
        return new Error(data?.message ?? error.message);
    }

    return error instanceof Error ? error : new Error('Unexpected request error.');
}
