import { apiClient, toApiError } from './apiClient';
import type { CatalogDto, LiveSessionDto, Paginated, VideoJobDto } from '../types/heygen';

type CreateVideoInput = {
    avatar_id: string;
    voice_id: string;
    script: string;
};

type CreateLiveSessionInput = {
    avatar_id: string;
    voice_id: string;
    quality?: 'low' | 'medium' | 'high';
};

export const heygenApi = {
    async getCatalog(): Promise<CatalogDto> {
        try {
            const response = await apiClient.get<{ data: CatalogDto }>('/api/heygen/catalog');
            return response.data.data;
        } catch (error) {
            throw toApiError(error);
        }
    },

    async createVideo(input: CreateVideoInput): Promise<{ data: VideoJobDto; quota: Record<string, number> }> {
        try {
            const response = await apiClient.post<{ data: VideoJobDto; quota: Record<string, number> }>('/api/heygen/videos', input);
            return response.data;
        } catch (error) {
            throw toApiError(error);
        }
    },

    async listVideos(page = 1): Promise<Paginated<VideoJobDto>> {
        try {
            const response = await apiClient.get<Paginated<VideoJobDto>>('/api/heygen/videos', { params: { page } });
            return response.data;
        } catch (error) {
            throw toApiError(error);
        }
    },

    async getVideo(id: number): Promise<VideoJobDto> {
        try {
            const response = await apiClient.get<{ data: VideoJobDto }>(`/api/heygen/videos/${id}`);
            return response.data.data;
        } catch (error) {
            throw toApiError(error);
        }
    },

    async createLiveSession(input: CreateLiveSessionInput): Promise<LiveSessionDto> {
        try {
            const response = await apiClient.post<{ data: LiveSessionDto }>('/api/heygen/live/sessions', input);
            return response.data.data;
        } catch (error) {
            throw toApiError(error);
        }
    },

    async endLiveSession(id: number): Promise<LiveSessionDto> {
        try {
            const response = await apiClient.post<{ data: LiveSessionDto }>(`/api/heygen/live/sessions/${id}/end`);
            return response.data.data;
        } catch (error) {
            throw toApiError(error);
        }
    },
};
