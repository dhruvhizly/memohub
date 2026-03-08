import { MediaItem } from "@/interfaces/media_response";
import Image from "next/image";
import { useState } from "react";
import { CONSTANTS } from "@/lib/constants";

interface ImageItemProps {
  item: MediaItem;
  gridCols: string;
}

export const ImageItem = ({ item, gridCols }: ImageItemProps) => {
  const [thumbnailError, setThumbnailError] = useState<boolean>(false);
  const thumbnailUrl = `${CONSTANTS.SERVER_URL}/media/thumbnail/${item.media_id}`;
  const fullUrl = `${CONSTANTS.SERVER_URL}/media/view/${item.media_id}`;

  return (
    <Image
      alt={item.filename}
      src={thumbnailError ? fullUrl : thumbnailUrl}
      width={0}
      height={0}
      sizes={gridCols}
      className="w-full h-auto block"
      onError={() => setThumbnailError(true)}
      unoptimized
    />
  );
}