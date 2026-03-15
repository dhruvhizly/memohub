import { MediaItem } from "@/interfaces/media_response";
import { memo, useState } from "react";
import { CONSTANTS } from "@/lib/constants";

interface ImageItemProps {
  item: MediaItem;
  priority?: boolean;
}

export const ImageItem = memo(
  ({ item, priority = false }: ImageItemProps) => {
    const thumb = `${CONSTANTS.SERVER_URL}/media/thumbnail/${item.media_id}`;
    const width = Number(item.width) || 1;
    const height = Number(item.height) || 1;

    return (
      <div className="relative w-full h-full bg-neutral-900 flex items-center justify-center overflow-hidden">
        <img
          src={thumb}
          width={width}
          height={height}
          className="w-full h-full object-cover block"
          loading={priority ? "eager" : undefined}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
        />
      </div>
    );
  },
);
