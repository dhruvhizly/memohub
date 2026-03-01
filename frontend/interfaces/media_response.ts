export interface MediaItem {
  media_id: string;
  filename: string;
  type: string;
  uploaded_at: string;
  size: string;
}

export interface MediaResponse {
  total: number;
  medias: MediaItem[];
}
