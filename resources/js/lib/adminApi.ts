import { apiClient, toApiError } from './apiClient';
import type { PermissionDto, RoleDto } from '../types/heygen';

type RolePayload = {
    name: string;
    permissions: string[];
};

type PermissionPayload = {
    name: string;
};

export const adminApi = {
    async listRoles(): Promise<RoleDto[]> {
        try {
            const response = await apiClient.get<{ data: RoleDto[] }>('/api/admin/roles');
            return response.data.data;
        } catch (error) {
            throw toApiError(error);
        }
    },

    async createRole(payload: RolePayload): Promise<RoleDto> {
        try {
            const response = await apiClient.post<{ data: RoleDto }>('/api/admin/roles', payload);
            return response.data.data;
        } catch (error) {
            throw toApiError(error);
        }
    },

    async updateRole(id: number, payload: RolePayload): Promise<RoleDto> {
        try {
            const response = await apiClient.put<{ data: RoleDto }>(`/api/admin/roles/${id}`, payload);
            return response.data.data;
        } catch (error) {
            throw toApiError(error);
        }
    },

    async deleteRole(id: number): Promise<void> {
        try {
            await apiClient.delete(`/api/admin/roles/${id}`);
        } catch (error) {
            throw toApiError(error);
        }
    },

    async listPermissions(): Promise<PermissionDto[]> {
        try {
            const response = await apiClient.get<{ data: PermissionDto[] }>('/api/admin/permissions');
            return response.data.data;
        } catch (error) {
            throw toApiError(error);
        }
    },

    async createPermission(payload: PermissionPayload): Promise<PermissionDto> {
        try {
            const response = await apiClient.post<{ data: PermissionDto }>('/api/admin/permissions', payload);
            return response.data.data;
        } catch (error) {
            throw toApiError(error);
        }
    },

    async updatePermission(id: number, payload: PermissionPayload): Promise<PermissionDto> {
        try {
            const response = await apiClient.put<{ data: PermissionDto }>(`/api/admin/permissions/${id}`, payload);
            return response.data.data;
        } catch (error) {
            throw toApiError(error);
        }
    },

    async deletePermission(id: number): Promise<void> {
        try {
            await apiClient.delete(`/api/admin/permissions/${id}`);
        } catch (error) {
            throw toApiError(error);
        }
    },
};

