"use client";
import axios from "axios";
import ViewMediaModal from "@/components/ViewMediaModal.component";
import { CONSTANTS } from "@/lib/constants";
import { useUserId } from "@/lib/store";
import { GroupedMediaItem, GroupedMediaResponse } from "@/interfaces/media_response";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Masonry from "react-masonry-css";
import {
  CheckBoxTickIcon,
  CloseIcon,
  GhostIcon,
  ScrollToTopIcon,
  UploadingLoader,
} from "@/lib/svg";
import { VideoItem } from "./VideoItem.component";
import { ImageItem } from "./ImageItem.component";

type GridMode = "Comfort" | "Compact" | "Dense";

const BREAKPOINT_MAPPING = {
  Comfort: { default: 6, 1536: 5, 1280: 4, 1024: 3, 768: 2, 500: 1 },
  Compact: { default: 8, 1536: 6, 1280: 5, 1024: 4, 768: 3, 500: 2 },
  Dense: { default: 10, 1536: 8, 1280: 6, 1024: 5, 768: 4, 500: 3 },
};

const GRID_SIZES_PROP = {
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

const GallerySkeleton = ({
  mode,
}: {
  mode: "Comfort" | "Compact" | "Dense";
}) => {
  // Simplified skeleton: render fewer items for faster performance
  const colCount = Math.min(4, BREAKPOINT_MAPPING[mode].default);
  const itemsPerCol = 2;

  return (
    <div className="flex w-full gap-4">
      {Array.from({ length: colCount }).map((_, colIndex) => (
        <div key={colIndex} className="flex flex-col gap-4 w-full">
          {Array.from({ length: itemsPerCol }).map((_, itemIndex) => {
            const height = 180 + (itemIndex * 80);
            return <SkeletonItem key={itemIndex} height={height} />;
          })}
        </div>
      ))}
    </div>
  );
};

// --- MAIN COMPONENT ---
const GalleryGrid = () => {
  const [groupedMediaItems, setGroupedMediaItems] = useState<Array<GroupedMediaItem>>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [gridCols, setGridCols] = useState<GridMode>("Compact");
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const isSelectionMode = selectedIds.size > 0;
  const observerTarget = useRef<HTMLDivElement>(null);
  const setUserId = useUserId((s) => s.setUserId);
  const flatMediaItems = useMemo(
    () => groupedMediaItems.flatMap(({label, items}) => items),
    [groupedMediaItems],
  );

  const PAGE_SIZE = 10;
  
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    const count = selectedIds.size;
    if (!confirm(`Are you sure you want to delete ${count} items?`)) return;

    try {
      const endpoint = `${CONSTANTS.SERVER_URL}/media/delete`;
      const res = await axios.delete(endpoint, {
        data: Array.from(selectedIds),
        withCredentials: true,
      });

      if (res.data.status === "success") {
        const deletedIdsFromServer = new Set(res.data.deleted);
        setGroupedMediaItems((prev) =>
          prev
            .map(({label, items}) => ({
              label,
              items: items.filter((item) => !deletedIdsFromServer.has(item.media_id)),
            }))
            .filter((({items}) => items.length > 0)),
        );
        setSelectedIds(new Set());
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || "Deletion failed");
    }
  };

  const openModal = (id: string) => {
    const index = flatMediaItems.findIndex((m) => m.media_id === id);
    setSelectedMediaIndex(index);
  };

  const handleUpload = async (files: File[]) => {
    if (!files.length) return;
    setIsUploading(true);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      await axios.post(`${CONSTANTS.SERVER_URL}/media/upload`, formData, {
        withCredentials: true,
        onUploadProgress: (p) =>
          p.total && setUploadProgress(Math.round((p.loaded * 100) / p.total)),
      });
      setTimeout(() => {
        setIsUploading(false);
        fetchMedia(1, true);
      }, 500);
    } catch (err: any) {
      alert("Upload failed");
      setIsUploading(false);
    }
  };

  const fetchMedia = useCallback(
    async (pageNum: number, resetList = false) => {
      if (isLoading && !resetList && groupedMediaItems.length > 0) return;
      setIsLoading(true);
      try {
        const endpoint = new URL("/media/", CONSTANTS.SERVER_URL);
        endpoint.searchParams.append("page", pageNum.toString());
        endpoint.searchParams.append("page_size", PAGE_SIZE.toString());

        const res = await axios.get<GroupedMediaResponse>(endpoint.toString(), {
          withCredentials: true,
        });
        const { groups, total } = res.data;

        setGroupedMediaItems((prev) => {
          if (resetList) return groups;

          const lastGroup = prev[prev.length - 1];
          const firstNewGroup = groups[0];

          if (lastGroup && firstNewGroup && lastGroup.label === firstNewGroup.label) {
            const mergedGroup: GroupedMediaItem = {
              label: lastGroup.label,
              items: [...lastGroup.items, ...firstNewGroup.items],
            };
            return [...prev.slice(0, -1), mergedGroup, ...groups.slice(1)];
          }
          return [...prev, ...groups];
        });

        setHasMore(pageNum * PAGE_SIZE < total);
        setPage(pageNum);
      } catch (err) {
        console.error("Failed to fetch media:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, groupedMediaItems.length],
  );

  useEffect(() => {
    fetchMedia(1, true);
  }, []);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          fetchMedia(page + 1);
        }
      },
      { threshold: 0.1, rootMargin: "1000px" },
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasMore, isLoading, page, fetchMedia]);

  useEffect(() => {
    document.body.style.overflow = selectedMediaIndex !== null ? "hidden" : "auto";
    return () => {document.body.style.overflow = "auto"};
  }, [selectedMediaIndex]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-neutral-950 text-neutral-200 relative">
      {/* Global Style overrides for React Masonry CSS to handle gap correctly */}
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
          margin-left: -16px; /* gutter size offset */
          width: auto;
        }
        .my-masonry-grid_column {
          padding-left: 16px; /* gutter size */
          background-clip: padding-box;
        }
      `}</style>

      {/* --- SELECTION OVERLAY --- */}
      {isSelectionMode && (
        <div className="fixed top-0 left-0 w-full z-50 bg-black text-white p-4 shadow-2xl flex justify-between items-center animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            >
              <CloseIcon />
            </button>
            <span className="font-bold text-lg">
              {selectedIds.size} selected
            </span>
          </div>
          <button
            onClick={handleDeleteSelected}
            className="bg-red-500 hover:bg-red-400 px-6 py-2 rounded-xl font-bold transition-all active:scale-95 shadow-lg cursor-pointer"
          >
            Delete Items
          </button>
        </div>
      )}

      {/* --- HEADER --- */}
      <header className="sticky top-0 w-full z-40 bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-900 px-4 py-4">
        <div className="mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <h1
            className="text-3xl font-extrabold tracking-tight cursor-pointer text-white hover:text-blue-400 transition-colors"
            onClick={() => window.location.reload()}
          >
            MemoHub
          </h1>
          <div className="flex flex-wrap justify-center gap-3 items-center">
            <label
              htmlFor="upload-input"
              className="relative px-3 py-2.5 rounded-xl font-bold overflow-hidden cursor-pointer bg-blue-600 text-white shadow-lg hover:bg-blue-500 active:scale-95 transition-all flex gap-2.5 justify-center items-center"
            >
              {isUploading && (
                <div
                  className="absolute inset-0 bg-blue-700 origin-left"
                  style={{ width: `${uploadProgress}%` }}
                />
              )}
              {isUploading && (
                <span className="relative z-10">
                  <UploadingLoader />
                </span>
              )}
              <span className="relative z-10 text-sm">
                {isUploading ? `${uploadProgress}%` : "Upload Media"}
              </span>
            </label>
            <input
              id="upload-input"
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) =>
                e.target.files && handleUpload(Array.from(e.target.files))
              }
            />
            <button
              onClick={() => setUserId("")}
              className="px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-red-400 font-bold text-sm hover:bg-red-950/30 cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="w-full h-full px-4 pt-8 pb-32">
        <div className="w-full space-y-12">
          {/* 1. LOADING STATE */}
          {isLoading && groupedMediaItems.length === 0 ? (
            <section className="space-y-4">
              <div className="h-6 w-32 bg-neutral-900 rounded-md animate-pulse mb-6 border-l-4 border-neutral-800" />
              <GallerySkeleton mode={gridCols} />
            </section>
          ) : groupedMediaItems.length === 0 ? (
            /* 2. EMPTY STATE */
            <div className="flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
              <div className="mb-6 opacity-80">
                <GhostIcon />
              </div>
              <h2 className="text-lg font-semibold text-gray-700">
                Nothing to show here yet
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Upload some files and they will show up here.
              </p>
            </div>
          ) : (
            /* 3. MASONRY GRID STATE */
            groupedMediaItems.map(({label, items}) => (
              <section key={label} className="space-y-4">
                <h2 className="text-md font-bold text-neutral-400 py-1 border-l-4 border-blue-600 pl-3">
                  {label}
                </h2>

                {/* --- MASONRY COMPONENT IMPLEMENTATION --- */}
                <Masonry
                  breakpointCols={BREAKPOINT_MAPPING[gridCols]}
                  className="my-masonry-grid"
                  columnClassName="my-masonry-grid_column"
                >
                  {items.map((item) => {
                    const isItemSelected = selectedIds.has(item.media_id);
                    return (
                      <div
                        key={item.media_id}
                        onClick={() =>
                          isSelectionMode
                            ? toggleSelection(item.media_id)
                            : openModal(item.media_id)
                        }
                        className={`relative w-full overflow-hidden rounded-xl bg-neutral-900 border transition-all duration-200 cursor-pointer group mb-4 ${
                          isItemSelected
                            ? "border-blue-500 ring-4 ring-blue-500/30 scale-[0.98]"
                            : "border-neutral-800 hover:border-neutral-600"
                        }`}
                      >
                        {/* Checkbox Overlay */}
                        <div
                          className={`absolute top-2 left-2 z-30 transition-opacity ${
                            isItemSelected
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-100"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelection(item.media_id);
                          }}
                        >
                          <div
                            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${isItemSelected ? "bg-blue-500 border-blue-500" : "bg-black/40 border-white/50 backdrop-blur-md"}`}
                          >
                            {isItemSelected && <CheckBoxTickIcon />}
                          </div>
                        </div>

                        {/* Media Content */}
                        {item.type.startsWith("image/") ? (
                          <ImageItem item={item} gridCols={GRID_SIZES_PROP[gridCols]} />
                        ) : (
                          <VideoItem item={item}/>
                        )}
                      </div>
                    );
                  })}
                </Masonry>
              </section>
            ))
          )}
        </div>

        {/* Load More Spinner */}
        <div
          ref={observerTarget}
          className="h-20 w-full flex items-center justify-center mt-10"
        >
          {isLoading && (
            <div className="w-6 h-6 border-2 border-neutral-700 border-t-blue-500 rounded-full animate-spin" />
          )}
        </div>
      </main>

      {/* --- VIEW CONTROLS --- */}
      {groupedMediaItems.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex bg-neutral-900/80 backdrop-blur-md border border-neutral-700 p-1.5 rounded-full shadow-2xl">
          {["Comfort", "Compact", "Dense"].map((size) => (
            <button
              key={size}
              onClick={() => setGridCols(size as any)}
              className={`px-4 py-2 text-sm font-bold rounded-full transition-all cursor-pointer ${
                gridCols === size
                  ? "bg-neutral-700 text-white"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      )}

      {/* SCROLL TO TOP BUTTON */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-6 right-6 p-4 bg-gray-800 hover:bg-blue-500 text-white rounded-full shadow-2xl transition-all duration-300 z-50 cursor-pointer ${showScrollTop ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"}`}
      >
        <ScrollToTopIcon />
      </button>

      {/* --- MEDIA VIEW MODAL --- */}
      <ViewMediaModal
        mediaItems={flatMediaItems}
        selectedMediaIndex={selectedMediaIndex}
        onChangeSelectedMediaIndex={setSelectedMediaIndex}
      />
    </div>
  );
};

export default GalleryGrid;
