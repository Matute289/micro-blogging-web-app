export interface User {
  id: string;
  username: string;
  created_at: string;
  last_seen_at: string;
}

export interface MediaItem {
  type: 'image' | 'video' | 'music';
  url: string;
}

export interface Tweet {
  id: string;
  user_id: string;
  text: string;
  media?: MediaItem[];
  created_at: string;
}

export interface PaginationParams {
  limit?: number;
  before?: string;
}
