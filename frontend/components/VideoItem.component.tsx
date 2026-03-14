import { MediaItem } from "@/interfaces/media_response";
import { PlayVideoIcon } from "@/lib/svg";
import { useState, useEffect, memo } from "react";
import { CONSTANTS } from "@/lib/constants";

interface VideoItemProps {
  item: MediaItem;
}

export const VideoItem = memo(({ item }: VideoItemProps) => {
  const [posterReady, setPosterReady] = useState<boolean>(false);
  const thumbnailUrl = `${CONSTANTS.SERVER_URL}/media/thumbnail/${item.media_id}`;
  const videoUrl = `${CONSTANTS.SERVER_URL}/media/view/${item.media_id}`;

  useEffect(() => {
    const img = new window.Image();
    img.src = thumbnailUrl;
    img.onload = () => setPosterReady(true);
    img.onerror = () => setPosterReady(false);
  }, [thumbnailUrl]);

  return (
    <div className="w-full h-full relative flex items-center justify-center bg-neutral-900 overflow-hidden">
      <video
        src={videoUrl}
        poster={posterReady ? thumbnailUrl : undefined}
        className="h-full w-auto max-w-full object-cover opacity-80 block"
        preload={posterReady ? "metadata" : "auto"}
        muted
      />
      <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
        <PlayVideoIcon />
      </div>
    </div>
  );
});