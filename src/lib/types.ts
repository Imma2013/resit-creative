export type AppTab = 'design' | 'video' | 'calendar' | 'agent' | 'settings';
export type DesignElementType = 'text' | 'image' | 'shape';
export type DesignElement = { id: string; type: DesignElementType; x: number; y: number; width: number; height: number; text?: string; style?: Record<string, string | number> };
export type TimelineClip = { id: string; name: string; start: number; duration: number; mediaId?: string; trackId?: string };
export type SocialPlatform = 'x' | 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'linkedin';
export type SocialPost = { id: string; platform: SocialPlatform; title: string; scheduledAt?: string; status: 'draft' | 'scheduled' | 'published' };
export type Asset = { id: string; name: string; type: 'image' | 'video' | 'audio' | 'font'; storagePath?: string };
