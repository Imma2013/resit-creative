export type AppTab = 'design' | 'video' | 'calendar' | 'agent' | 'settings';

export type DesignElementType = 'text' | 'image' | 'shape' | 'frame' | 'vector';
export type DesignElement = {
  id: string;
  type: DesignElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  src?: string;
  style?: Record<string, string | number>;
  rotation?: number;
  zIndex?: number;
  parentId?: string;
  layout?: { mode: 'none' | 'horizontal' | 'vertical'; gap: number; padding: number; align: 'start' | 'center' | 'end' | 'stretch' };
  constraints?: { horizontal: 'left' | 'right' | 'center' | 'scale'; vertical: 'top' | 'bottom' | 'center' | 'scale' };
  component?: DesignElementComponent;
};

export type DesignElementComponent = { componentId: string; variant?: string; overrides?: Record<string, string | number> };

export type DesignAction = {
  name: string;
  args: Record<string, unknown>;
};

export type TimelineClip = {
  id: string;
  name: string;
  start: number;
  duration: number;
  mediaId?: string;
  trackId?: string;
};

export type SocialPlatform = 'x' | 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'linkedin';
export type SocialPost = {
  id: string;
  platform: SocialPlatform;
  title: string;
  scheduledAt?: string;
  status: 'draft' | 'scheduled' | 'published';
};

export type Asset = {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'font';
  storagePath?: string;
};


export type AgentMode = 'generate' | 'edit' | 'critique';

export type DesignTokenBinding = {
  property: string;
  tokenId: string;
};

export type DesignComponentInstance = {
  componentId: string;
  variant?: string;
  overrides?: Record<string, string | number>;
};
