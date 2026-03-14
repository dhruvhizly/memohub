import { MediaItem } from "@/interfaces/media_response";
import { memo, useState } from "react";
import { CONSTANTS } from "@/lib/constants";

interface ImageItemProps {
  item: MediaItem;
  priority?: boolean;
}

export const ImageItem = memo(
  ({ item, priority = false }: ImageItemProps) => {
    const [loaded, setLoaded] = useState(false);

    const thumb = `${CONSTANTS.SERVER_URL}/media/thumbnail/${item.media_id}`;
    const full = `${CONSTANTS.SERVER_URL}/media/view/${item.media_id}`;

    return (
      <div className="relative w-full h-full bg-neutral-900">
        <img
          src={thumb}
          className="w-full h-full object-cover block"
          loading="lazy"
          decoding="async"
        />

        {/* <img
          src={full}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setLoaded(true)}
          style={{contentVisibility: "auto", containIntrinsicSize: "200px"}}
        /> */}
      </div>
    );
  },
);
