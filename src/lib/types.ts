export type AppTab = "design" | "video" | "calendar" | "agent" | "settings";

export type DesignElement = {
  id: string;
  type: "text" | "image" | "shape";
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
};

export type TimelineClip = {
  id: string;
  name: string;
  start: number;
  duration: number;
  mediaId?: string;
};

export type SocialPost = {
  id: string;
  platform: "x" | "instagram" | "facebook" | "tiktok" | "youtube" | "linkedin";
  title: string;
  scheduledAt: string;
  status: "draft" | "scheduled" | "published";
};
