import { apiClient, toApiError } from './apiClient';
import type { CatalogDto, DigitalTwinDto, LiveQuotaDto, LiveSessionDto, Paginated, PublicAvatarDetailDto, PublicAvatarListDto, VideoAgentJobDto, VideoJobDto, VideoJobListDto } from '../types/heygen';

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

type CreateVideoAgentInput = {
    prompt: string;
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

    async createVideoAgent(input: CreateVideoAgentInput): Promise<{ data: VideoAgentJobDto; quota: Record<string, number> }> {
        try {
            const response = await apiClient.post<{ data: VideoAgentJobDto; quota: Record<string, number> }>('/api/admin/heygen/video-agent/videos', input);
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

    async listDigitalTwins(params: {
        page?: number;
        per_page?: number;
        status?: DigitalTwinDto['status'];
    } = {}): Promise<Paginated<DigitalTwinDto>> {
        try {
            const response = await apiClient.get<Paginated<DigitalTwinDto>>('/api/heygen/digital-twins', { params });
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

    async listVideos(params: {
        page?: number;
        per_page?: number;
        status?: VideoJobDto['status'];
    } = {}): Promise<VideoJobListDto> {
        try {
            const response = await apiClient.get<VideoJobListDto>('/api/heygen/videos', { params });
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

    async listVideoAgentVideos(page = 1): Promise<Paginated<VideoAgentJobDto>> {
        try {
            const response = await apiClient.get<Paginated<VideoAgentJobDto>>('/api/admin/heygen/video-agent/videos', { params: { page } });
            return response.data;
        } catch (error) {
            throw toApiError(error);
        }
    },

    async getVideoAgentVideo(id: number): Promise<VideoAgentJobDto> {
        try {
            const response = await apiClient.get<{ data: VideoAgentJobDto }>(`/api/admin/heygen/video-agent/videos/${id}`);
            return response.data.data;
        } catch (error) {
            throw toApiError(error);
        }
    },

    async getLiveQuota(): Promise<LiveQuotaDto> {
        try {
            const response = await apiClient.get<{ data: LiveQuotaDto }>('/api/heygen/live/quota');
            return response.data.data;
        } catch (error) {
            throw toApiError(error);
        }
    },

    async createLiveSession(input: CreateLiveSessionInput): Promise<{ data: LiveSessionDto; quota: LiveQuotaDto }> {
        try {
            const response = await apiClient.post<{ data: LiveSessionDto; quota: LiveQuotaDto }>('/api/heygen/live/sessions', input);
            return response.data;
        } catch (error) {
            throw toApiError(error);
        }
    },

    async activateLiveSession(id: number): Promise<LiveSessionDto> {
        try {
            const response = await apiClient.post<{ data: LiveSessionDto }>(`/api/heygen/live/sessions/${id}/activate`);
            return response.data.data;
        } catch (error) {
            throw toApiError(error);
        }
    },

    async endLiveSession(id: number): Promise<{ data: LiveSessionDto; quota: LiveQuotaDto }> {
        try {
            const response = await apiClient.post<{ data: LiveSessionDto; quota: LiveQuotaDto }>(`/api/heygen/live/sessions/${id}/end`);
            return response.data;
        } catch (error) {
            throw toApiError(error);
        }
    },
};
