import axios, { AxiosError } from 'axios';
import type { ApiErrorDto, CatalogDto, LiveSessionDto, Paginated, VideoJobDto } from '../types/heygen';

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

const client = axios.create({
    headers: {
        Accept: 'application/json',
    },
});

function toError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
        const data = (error as AxiosError<ApiErrorDto>).response?.data;
        return new Error(data?.message ?? error.message);
    }

    return error instanceof Error ? error : new Error('Unexpected request error.');
}

export const heygenApi = {
    async getCatalog(): Promise<CatalogDto> {
        try {
            const response = await client.get<{ data: CatalogDto }>('/api/heygen/catalog');
            return response.data.data;
        } catch (error) {
            throw toError(error);
        }
    },

    async createVideo(input: CreateVideoInput): Promise<{ data: VideoJobDto; quota: Record<string, number> }> {
        try {
            const response = await client.post<{ data: VideoJobDto; quota: Record<string, number> }>('/api/heygen/videos', input);
            return response.data;
        } catch (error) {
            throw toError(error);
        }
    },

    async listVideos(page = 1): Promise<Paginated<VideoJobDto>> {
        try {
            const response = await client.get<Paginated<VideoJobDto>>('/api/heygen/videos', { params: { page } });
            return response.data;
        } catch (error) {
            throw toError(error);
        }
    },

    async getVideo(id: number): Promise<VideoJobDto> {
        try {
            const response = await client.get<{ data: VideoJobDto }>(`/api/heygen/videos/${id}`);
            return response.data.data;
        } catch (error) {
            throw toError(error);
        }
    },

    async createLiveSession(input: CreateLiveSessionInput): Promise<LiveSessionDto> {
        try {
            const response = await client.post<{ data: LiveSessionDto }>('/api/heygen/live/sessions', input);
            return response.data.data;
        } catch (error) {
            throw toError(error);
        }
    },

    async endLiveSession(id: number): Promise<LiveSessionDto> {
        try {
            const response = await client.post<{ data: LiveSessionDto }>(`/api/heygen/live/sessions/${id}/end`);
            return response.data.data;
        } catch (error) {
            throw toError(error);
        }
    },
};
