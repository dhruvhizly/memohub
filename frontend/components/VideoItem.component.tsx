import { MediaItem } from "@/interfaces/media_response";
import { PlayVideoIcon } from "@/lib/svg";
import { memo, useState, useEffect } from "react";
import { CONSTANTS } from "@/lib/constants";

interface VideoItemProps {
  item: MediaItem;
}

export const VideoItem = memo(({ item }: VideoItemProps) => {
  const thumbnailUrl = `${CONSTANTS.SERVER_URL}/media/thumbnail/${item.media_id}`;
  const videoUrl = `${CONSTANTS.SERVER_URL}/media/view/${item.media_id}`;

  const width = Number(item.width) || 1;
  const height = Number(item.height) || 1;

  const [thumbloaded, setThumbLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = thumbnailUrl;
    img.onload = () => setThumbLoaded(true);
  }, [thumbnailUrl]);

  return (
    <div className="w-full h-full relative flex items-center justify-center bg-neutral-900 overflow-hidden">
      <video
        width={width}
        height={height}
        src={videoUrl}
        poster={thumbloaded ? thumbnailUrl : undefined}
        className="w-full h-full object-cover opacity-80 block"
        preload="metadata"
        muted
      />
      <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
        <PlayVideoIcon />
      </div>
    </div>
  );
});
