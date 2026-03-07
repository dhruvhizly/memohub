export interface GroupedMediaResponse {
  total: number;
  page: number;
  page_size: number;
  groups: Array<GroupedMediaItem>
}

export interface GroupedMediaItem {
  label: string;
  items: MediaItem[];
}

export interface MediaItem {
  media_id: string;
  filename: string;
  type: string;
  uploaded_at: string;
  size: string;
}
