import axios from 'axios';
import { toApiError } from './apiClient';
import type { AuthTokenDto, AuthUserDto } from '../types/heygen';

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

type ForgotPasswordInput = {
    email: string;
};

type ResetPasswordInput = {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
};

const authClient = axios.create({
    withCredentials: true,
    headers: {
        Accept: 'application/json',
    },
});

export const authApi = {
    async register(payload: RegisterInput): Promise<{ user: AuthUserDto; verification_sent: boolean; message: string }> {
        try {
            const response = await authClient.post<{
                message: string;
                data: {
                    user: AuthUserDto;
                    verification_sent: boolean;
                };
            }>('/api/auth/register', payload);

            return {
                user: response.data.data.user,
                verification_sent: response.data.data.verification_sent,
                message: response.data.message,
            };
        } catch (error) {
            throw toApiError(error);
        }
    },

    async login(payload: LoginInput): Promise<AuthTokenDto> {
        try {
            const response = await authClient.post<{ data: AuthTokenDto }>('/api/auth/login', payload);
            return response.data.data;
        } catch (error) {
            throw toApiError(error);
        }
    },

    async adminLogin(payload: LoginInput): Promise<AuthTokenDto> {
        try {
            const response = await authClient.post<{ data: AuthTokenDto }>('/api/auth/admin/login', payload);
            return response.data.data;
        } catch (error) {
            throw toApiError(error);
        }
    },

    async refresh(): Promise<AuthTokenDto> {
        try {
            const response = await authClient.post<{ data: AuthTokenDto }>('/api/auth/refresh');
            return response.data.data;
        } catch (error) {
            throw toApiError(error);
        }
    },

    async me(accessToken: string): Promise<AuthUserDto> {
        try {
            const response = await authClient.get<{ data: { user: AuthUserDto } }>('/api/auth/me', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return response.data.data.user;
        } catch (error) {
            throw toApiError(error);
        }
    },

    async logout(accessToken: string): Promise<void> {
        try {
            await authClient.post('/api/auth/logout', undefined, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
        } catch (error) {
            throw toApiError(error);
        }
    },

    async logoutAll(accessToken: string): Promise<void> {
        try {
            await authClient.post('/api/auth/logout-all', undefined, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
        } catch (error) {
            throw toApiError(error);
        }
    },

    async resendVerification(accessToken: string): Promise<string> {
        try {
            const response = await authClient.post<{ message: string }>('/api/auth/email/verification-notification', undefined, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return response.data.message;
        } catch (error) {
            throw toApiError(error);
        }
    },

    async forgotPassword(payload: ForgotPasswordInput): Promise<string> {
        try {
            const response = await authClient.post<{ message: string }>('/api/auth/forgot-password', payload);
            return response.data.message;
        } catch (error) {
            throw toApiError(error);
        }
    },

    async resetPassword(payload: ResetPasswordInput): Promise<string> {
        try {
            const response = await authClient.post<{ message: string }>('/api/auth/reset-password', payload);
            return response.data.message;
        } catch (error) {
            throw toApiError(error);
        }
    },
};
