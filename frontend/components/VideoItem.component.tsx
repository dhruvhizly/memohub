import { MediaItem } from "@/interfaces/media_response";
import { PlayVideoIcon } from "@/lib/svg";
import { useState, useEffect } from "react";
import { CONSTANTS } from "@/lib/constants";

interface VideoItemProps {
  item: MediaItem;
}

export const VideoItem = ({ item }: VideoItemProps) => {
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
    <div className="w-full relative">
      <video
        src={videoUrl}
        poster={posterReady ? thumbnailUrl : undefined}
        className="w-full h-auto opacity-80"
        preload={posterReady ? "metadata" : "auto"}
        muted
      />
      <div className="absolute inset-0 flex items-center justify-center z-20">
        <PlayVideoIcon />
      </div>
    </div>
  );
}