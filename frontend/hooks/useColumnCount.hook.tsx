import {
  BREAKPOINT_MAPPING,
  GridMode,
} from "@/components/GalleryCommon.component";
import { useCallback, useEffect, useState } from "react";

export const useColumnCount = (gridMode: GridMode) => {
  const getCount = useCallback(() => {
    const mapping = BREAKPOINT_MAPPING[gridMode];
    const width = typeof window !== "undefined" ? window.innerWidth : 1024;
    const sortedBreakpoints = Object.keys(mapping)
      .filter((k): k is string => k !== "default")
      .map(Number)
      .sort((a, b) => b - a);

    for (const bp of sortedBreakpoints) {
      if (width >= bp) {
        return mapping[bp as keyof typeof mapping];
      }
    }
    return mapping.default;
  }, [gridMode]);

  const [count, setCount] = useState(getCount);

  useEffect(() => {
    // Set the count on mount to ensure it's correct on the client,
    // as the server-rendered value is based on a default width.
    setCount(getCount());
    const onResize = () => setCount(getCount());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [getCount]);

  return count;
};
