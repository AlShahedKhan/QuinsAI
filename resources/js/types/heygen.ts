export type VideoJobStatus = 'queued' | 'submitting' | 'processing' | 'completed' | 'failed';

export type LiveSessionStatus = 'created' | 'active' | 'ended' | 'failed';

export type VideoJobDto = {
    id: number;
    avatar_id: string;
    voice_id: string;
    script: string;
    status: VideoJobStatus;
    provider_video_id: string | null;
    error_code: string | null;
    error_message: string | null;
    output_provider_url: string | null;
    output_storage_url: string | null;
    submitted_at: string | null;
    completed_at: string | null;
    failed_at: string | null;
    created_at: string | null;
    updated_at: string | null;
};

export type LiveSessionDto = {
    id: number;
    provider_session_id: string | null;
    status: LiveSessionStatus;
    token: string | null;
    metadata: {
        ice_servers: unknown[];
        session_response: Record<string, unknown>;
    };
    token_expires_at: string | null;
    started_at: string | null;
    ended_at: string | null;
    created_at: string | null;
    updated_at: string | null;
};

export type CatalogItem = {
    id?: string;
    avatar_id?: string;
    voice_id?: string;
    name?: string;
    display_name?: string;
    preview_image_url?: string;
    [key: string]: unknown;
};

export type CatalogDto = {
    avatars: CatalogItem[];
    voices: CatalogItem[];
};

export type ApiErrorDto = {
    message: string;
    error?: {
        code?: string;
        context?: unknown;
    };
};

export type AuthUserDto = {
    id: number;
    name: string;
    email: string;
    email_verified_at: string | null;
};

export type AuthTokenDto = {
    access_token: string;
    token_type: 'Bearer';
    expires_in: number;
    user: AuthUserDto;
};

export type AuthState = {
    status: 'loading' | 'authenticated' | 'unauthenticated';
    accessToken: string | null;
    user: AuthUserDto | null;
};

export type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
};
