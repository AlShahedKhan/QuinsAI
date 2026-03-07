import { apiClient, toApiError } from './apiClient';
import type { CatalogDto, DigitalTwinDto, LiveSessionDto, Paginated, PublicAvatarDetailDto, PublicAvatarListDto, VideoJobDto } from '../types/heygen';

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
    async getCatalog(options: { include?: 'all' | 'avatars' | 'voices' } = {}): Promise<CatalogDto> {
        const include = options.include ?? 'all';

        try {
            const response = await apiClient.get<{ data: CatalogDto }>('/api/heygen/catalog', {
                params: include === 'all' ? undefined : { include },
            });
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

    async listPublicAvatars(params: { page?: number; per_page?: number; search?: string; category?: string } = {}): Promise<PublicAvatarListDto> {
        try {
            const response = await apiClient.get<PublicAvatarListDto>('/api/heygen/public-avatars', { params });
            return response.data;
        } catch (error) {
            throw toApiError(error);
        }
    },

    async getPublicAvatarDetails(avatarId: string): Promise<PublicAvatarDetailDto> {
        try {
            const response = await apiClient.get<{ data: PublicAvatarDetailDto }>(`/api/heygen/public-avatars/${encodeURIComponent(avatarId)}/details`);
            return response.data.data;
        } catch (error) {
            throw toApiError(error);
        }
    },

    async createDigitalTwin(input: FormData): Promise<{ data: DigitalTwinDto; quota: Record<string, number> }> {
        try {
            const response = await apiClient.post<{ data: DigitalTwinDto; quota: Record<string, number> }>(
                '/api/heygen/digital-twins',
                input,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                },
            );
            return response.data;
        } catch (error) {
            throw toApiError(error);
        }
    },

    async listDigitalTwins(page = 1): Promise<Paginated<DigitalTwinDto>> {
        try {
            const response = await apiClient.get<Paginated<DigitalTwinDto>>('/api/heygen/digital-twins', { params: { page } });
            return response.data;
        } catch (error) {
            throw toApiError(error);
        }
    },

    async getDigitalTwin(id: number): Promise<DigitalTwinDto> {
        try {
            const response = await apiClient.get<{ data: DigitalTwinDto }>(`/api/heygen/digital-twins/${id}`);
            return response.data.data;
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
