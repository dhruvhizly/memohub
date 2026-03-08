"use client";

import { ScrollToTopIcon } from "@/lib/svg";
import { useEffect, useState, RefObject } from "react";
import { createPortal } from "react-dom";

export type GridMode = "Comfort" | "Compact" | "Dense";

export const BREAKPOINT_MAPPING = {
  Comfort: { default: 6, 1536: 5, 1280: 4, 1024: 3, 768: 2, 500: 1 },
  Compact: { default: 8, 1536: 6, 1280: 5, 1024: 4, 768: 3, 500: 2 },
  Dense: { default: 10, 1536: 8, 1280: 6, 1024: 5, 768: 4, 500: 3 },
};

export const GRID_SIZES_PROP = {
  Comfort: "(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw",
  Compact: "(max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw",
  Dense: "(max-width: 768px) 25vw, (max-width: 1024px) 20vw, 12vw",
};

const SkeletonItem = ({ height }: { height: number }) => (
  <div
    style={{ height: `${height}px` }}
    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl mb-4 relative overflow-hidden"
  >
    <div className="absolute inset-0 bg-linear-to-r from-transparent via-neutral-700/20 to-transparent animate-shimmer" />
  </div>
);

export const GallerySkeleton = ({ mode }: { mode: GridMode }) => {
  const colCount = Math.min(4, BREAKPOINT_MAPPING[mode].default);
  const itemsPerCol = 2;

  return (
    <div className="flex w-full gap-4">
      {Array.from({ length: colCount }).map((_, colIndex) => (
        <div key={colIndex} className="flex flex-col gap-4 w-full">
          {Array.from({ length: itemsPerCol }).map((_, itemIndex) => {
            const height = 180 + itemIndex * 80;
            return <SkeletonItem key={itemIndex} height={height} />;
          })}
        </div>
      ))}
    </div>
  );
};

export const MasonryStyles = () => (
  <style jsx global>{`
    @keyframes shimmer {
      0% {
        transform: translateX(-100%);
      }
      100% {
        transform: translateX(100%);
      }
    }
    .animate-shimmer {
      animation: shimmer 2s infinite;
    }
    .my-masonry-grid {
      display: flex;
      margin-left: -16px;
      width: auto;
    }
    .my-masonry-grid_column {
      padding-left: 16px;
      background-clip: padding-box;
    }
    @media (max-width: 640px) {
      .my-masonry-grid {
        margin-left: -8px;
      }
      .my-masonry-grid_column {
        padding-left: 8px;
      }
    }
  `}</style>
);

export const ScrollToTopButton = () => {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  if (!mounted) return null;

  return createPortal(
    <button
      onClick={scrollToTop}
      className={`fixed bottom-20 md:bottom-6 right-4 md:right-6 p-3 md:p-4 bg-gray-800 hover:bg-blue-500 text-white rounded-full shadow-2xl transition-all duration-300 z-50 cursor-pointer ${
        showScrollTop ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
      }`}
    >
      <ScrollToTopIcon />
    </button>,
    document.body
  );
};

export const GridControls = ({
  gridCols,
  setGridCols,
}: {
  gridCols: GridMode;
  setGridCols: (mode: GridMode) => void;
}) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex bg-neutral-900/80 backdrop-blur-md border border-neutral-700 p-1 md:p-1.5 rounded-full shadow-2xl scale-90 md:scale-100 origin-bottom">
      {["Comfort", "Compact", "Dense"].map((size) => (
        <button
          key={size}
          onClick={() => setGridCols(size as any)}
          className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-bold rounded-full transition-all cursor-pointer ${
            gridCols === size
              ? "bg-neutral-700 text-white"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          {size}
        </button>
      ))}
    </div>,
    document.body
  );
};

export const LoadMoreSpinner = ({
  targetRef,
  isLoading,
}: {
  targetRef: RefObject<HTMLDivElement | null>;
  isLoading: boolean;
}) => (
  <div
    ref={targetRef}
    className="h-20 w-full flex items-center justify-center mt-10"
  >
    {isLoading && (
      <div className="w-6 h-6 border-2 border-neutral-700 border-t-blue-500 rounded-full animate-spin" />
    )}
  </div>
);