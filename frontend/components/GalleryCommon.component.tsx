"use client";

import { ScrollToTopIcon } from "@/lib/svg";
import { useEffect, useState, RefObject } from "react";
import { createPortal } from "react-dom";

export type GridMode = "Comfort" | "Compact" | "Dense";

export const GRID_MODE_STYLES: Record<GridMode, { itemClass: string; estimateHeight: number }> = {
  Comfort: { itemClass: "h-60", estimateHeight: 240 + 16 }, // 240px
  Compact: { itemClass: "h-50", estimateHeight: 200 + 16 }, // 200px
  Dense:   { itemClass: "h-40", estimateHeight: 160 + 16 }, // 160px
};

export const BREAKPOINT_MAPPING = {
  Comfort: { default: 1, 500: 1, 768: 2, 1024: 3, 1280: 4, 1536: 5, 1920: 7 },
  Compact: { default: 1, 500: 2, 768: 3, 1024: 4, 1280: 5, 1536: 7, 1920: 8, 2200: 10 },
  Dense:   { default: 1, 500: 2, 768: 4, 1024: 5, 1280: 7, 1536: 8, 1920: 10 },
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
  const colCount = BREAKPOINT_MAPPING[mode][1024];
  const itemsPerCol = 2;

  return (
    <div className="flex w-full" style={{ gap: "16px" }}>
      {Array.from({ length: colCount }).map((_, colIndex) => (
        <div key={colIndex} className="flex flex-col w-full" style={{ gap: "16px" }}>
          {Array.from({ length: itemsPerCol }).map((_, itemIndex) => {
            const height = 180 + Math.random() * 150;
            return <SkeletonItem key={itemIndex} height={height} />;
          })}
        </div>
      ))}
    </div>
  );
};

export const ScrollToTopButton = ({
  scrollRef,
}: {
  scrollRef?: RefObject<HTMLDivElement | null>;
}) => {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const scrollElement = scrollRef?.current ?? window;
    const handleScroll = () => {
      const scrollTop = scrollRef?.current
        ? scrollRef.current.scrollTop
        : window.scrollY;
      setShowScrollTop(scrollTop > 400);
    };
    scrollElement.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => scrollElement.removeEventListener("scroll", handleScroll);
  }, [scrollRef]);

  const scrollToTop = () => {
    const target = scrollRef?.current ?? window;
    target.scrollTo({ top: 0, behavior: "smooth" });
  };

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

export const LoadMoreSpinner = ({ isLoading }: { isLoading: boolean }) => (
  <div className="h-20 w-full flex items-center justify-center mt-10">
    {isLoading && (
      <div className="w-6 h-6 border-2 border-neutral-700 border-t-blue-500 rounded-full animate-spin" />
    )}
  </div>
);