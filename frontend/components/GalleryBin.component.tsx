"use client";
import axios from "axios";
import Link from "next/link";
import Masonry from "react-masonry-css";
import { createPortal } from "react-dom";
import { CONSTANTS } from "@/lib/constants";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { CheckBoxTickIcon, ChevronLeft, CloseIcon, GhostIcon } from "@/lib/svg";
import { ConfirmationModalState } from "@/interfaces/common_interfaces";
import { ViewMediaModal } from "@/components/ViewMediaModal.component";
import { VideoItem } from "@/components/VideoItem.component";
import { ImageItem } from "@/components/ImageItem.component";
import { ConfirmationModal } from "@/components/ConfirmationModal.component";
import { UserModal } from "@/components/UserModal.component";
import {
  BREAKPOINT_MAPPING,
  GallerySkeleton,
  GridControls,
  GridMode,
  GRID_SIZES_PROP,
  LoadMoreSpinner,
  MasonryStyles,
  ScrollToTopButton,
} from "@/components/GalleryCommon.component";
import { MediaItem } from "@/interfaces/media_response";

// --- MAIN COMPONENT ---
const GalleryBin = () => {
  const [mediaItems, setMediaItems] = useState<Array<MediaItem>>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gridCols, setGridCols] = useState<GridMode>("Compact");
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(
    null,
  );
  const [mounted, setMounted] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const isSelectionMode = selectedIds.size > 0;
  const [confirmationModalState, setConfirmationModalState] =
    useState<ConfirmationModalState>({
      title: "",
      subtext: "",
      confirmText: "",
      cancelText: "",
      onConfirm: () => {},
      onCancel: () => {},
    });

  const PAGE_SIZE = 10;

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const areAllSelected =
    mediaItems.length > 0 &&
    mediaItems.every((item) => selectedIds.has(item.media_id));

  const toggleSelectAll = () => {
    if (areAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(mediaItems.map((item) => item.media_id)));
    }
  };

  const handleRestoreSelected = async () => {
    try {
      const endpoint = `${CONSTANTS.SERVER_URL}/bin/restore`;
      const res = await axios.post(
        endpoint,
        { media_ids: Array.from(selectedIds) },
        { withCredentials: true },
      );

      if (res.data.status === "success") {
        const restoredIds = new Set(res.data.restored);
        setMediaItems((prev) =>
          prev.filter((item) => !restoredIds.has(item.media_id)),
        );
        setSelectedIds(new Set());
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || "Restore failed");
    }
  };

  const handleDeleteForever = () => {
    const deleteItems = async () => {
      closeConfirmationModal();
      try {
        const endpoint = `${CONSTANTS.SERVER_URL}/media/delete`;
        const res = await axios.delete(endpoint, {
          data: Array.from(selectedIds),
          withCredentials: true,
        });

        if (res.data.status === "success") {
          const deletedIdsFromServer = new Set(res.data.deleted);
          setMediaItems((prev) =>
            prev.filter((item) => !deletedIdsFromServer.has(item.media_id)),
          );
          setSelectedIds(new Set());
        }
      } catch (err: any) {
        alert(err.response?.data?.detail || "Deletion failed");
      }
    };

    const count = selectedIds.size;
    setConfirmationModalState({
      title: `Permanently delete ${count} item(s)?`,
      subtext: "This action cannot be undone.",
      confirmText: "Delete Forever",
      cancelText: "Cancel",
      onConfirm: deleteItems,
      onCancel: closeConfirmationModal,
    });
  };

  const openModal = (id: string) => {
    const index = mediaItems.findIndex((m) => m.media_id === id);
    setSelectedMediaIndex(index);
  };

  const closeConfirmationModal = () =>
    setConfirmationModalState({
      title: "",
      confirmText: "",
      cancelText: "",
      onConfirm: () => {},
      onCancel: () => {},
    });

  const fetchBinMedia = useCallback(
    async (pageNum: number, resetList = false) => {
      if (isLoading && !resetList && mediaItems.length > 0) return;
      setIsLoading(true);
      try {
        const endpoint = new URL("/bin", CONSTANTS.SERVER_URL);
        endpoint.searchParams.append("page", pageNum.toString());
        endpoint.searchParams.append("page_size", PAGE_SIZE.toString());

        const res = await axios.get<{
          total: number;
          page: number;
          page_size: number;
          medias: MediaItem[];
        }>(endpoint.toString(), {
          withCredentials: true,
        });
        const { medias, total } = res.data;

        setMediaItems((prev) => {
          if (resetList) return medias;
          return [...medias, ...prev];
        });

        setHasMore(pageNum * PAGE_SIZE < total);
        setPage(pageNum);
      } catch (err) {
        console.error("Failed to fetch bin media:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, mediaItems.length],
  );

  useEffect(() => {
    fetchBinMedia(1, true);
    setMounted(true);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          fetchBinMedia(page + 1);
        }
      },
      { threshold: 0.1, rootMargin: "1000px" },
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasMore, isLoading, page, fetchBinMedia]);

  useEffect(() => {
    document.body.style.overflow =
      selectedMediaIndex !== null ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [selectedMediaIndex]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-neutral-950 text-neutral-200 relative">
      <MasonryStyles />

      {/* --- CONFIRMATION MODAL --- */}
      <ConfirmationModal state={confirmationModalState} />

      {/* --- SELECTION OVERLAY --- */}
      {isSelectionMode &&
        mounted &&
        createPortal(
          <div className="fixed top-0 left-0 w-full z-50 bg-black text-white p-3 md:p-4 shadow-2xl flex justify-between items-center animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-3 md:gap-4">
              <button
                onClick={() => setSelectedIds(new Set())}
                className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <CloseIcon />
              </button>
              <span className="font-bold text-base md:text-lg">
                {selectedIds.size} selected
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRestoreSelected}
                className="bg-blue-600 hover:bg-blue-500 px-4 md:px-6 py-2 rounded-xl font-bold transition-all active:scale-95 shadow-lg cursor-pointer text-sm md:text-base"
              >
                Restore
              </button>
              <button
                onClick={handleDeleteForever}
                className="bg-red-500 hover:bg-red-400 px-4 md:px-6 py-2 rounded-xl font-bold transition-all active:scale-95 shadow-lg cursor-pointer text-sm md:text-base"
              >
                Delete
              </button>
            </div>
          </div>,
          document.body,
        )}

      {/* --- HEADER --- */}
      <header className="sticky top-0 w-full z-40 bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-900 px-3 py-3 md:px-4 md:py-4">
        <div className="mx-auto flex flex-row justify-between items-center gap-2 md:gap-4">
          <div className="flex items-center gap-2 md:gap-4">
            <Link href="/" passHref>
              <button
                aria-label="Go back to gallery"
                className="p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              >
                <ChevronLeft />
              </button>
            </Link>
            <div className="flex flex-col leading-tight">
              <h1 className="text-xl md:text-3xl font-bold tracking-tight text-white">
                Bin
              </h1>
              <h3 className="text-xs md:text-sm font-semibold tracking-tight text-gray-400">
                Deleted items will be automatically removed after 30 days.
              </h3>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-2 md:gap-3 items-center">
            <UserModal is_bin={true} />
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="w-full h-full px-2 md:px-4 pt-4 md:pt-8 pb-32">
        <div className="w-full space-y-5">
          {/* 1. LOADING STATE */}
          {isLoading && mediaItems.length === 0 ? (
            <section className="space-y-4">
              <div className="h-6 w-32 bg-neutral-900 rounded-md animate-pulse mb-6 border-l-4 border-neutral-800" />
              <GallerySkeleton mode={gridCols} />
            </section>
          ) : mediaItems.length === 0 ? (
            /* 2. EMPTY STATE */
            <div className="flex flex-col items-center justify-center text-center animate-in fade-in duration-500 mt-20">
              <div className="mb-6 opacity-80">
                <GhostIcon />
              </div>
              <h2 className="text-lg font-semibold text-gray-700">
                The bin is empty
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Items moved to the bin will appear here.
              </p>
            </div>
          ) : (
            /* 3. MASONRY GRID STATE */
            <>
              <div className="flex items-center gap-3 pb-4">
                <button
                  onClick={toggleSelectAll}
                  className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors cursor-pointer ${
                    areAllSelected || selectedIds.size > 0
                      ? "bg-blue-600 border-blue-600"
                      : "border-neutral-600 hover:border-neutral-400"
                  }`}
                >
                  {areAllSelected && <CheckBoxTickIcon />}
                  {!areAllSelected && selectedIds.size > 0 && (
                    <div className="w-3 h-0.5 bg-white rounded-full" />
                  )}
                </button>
                <span className="text-sm font-bold text-neutral-400">
                  Select All
                </span>
              </div>
              <Masonry
                breakpointCols={BREAKPOINT_MAPPING[gridCols]}
                className="my-masonry-grid"
                columnClassName="my-masonry-grid_column"
              >
                {mediaItems.map((item, index) => {
                  const isItemSelected = selectedIds.has(item.media_id);
                  return (
                    <div
                      key={item.media_id}
                      onClick={() =>
                        isSelectionMode
                          ? toggleSelection(item.media_id)
                          : openModal(item.media_id)
                      }
                      onContextMenu={(e) => {
                        if (!isSelectionMode) {
                          e.preventDefault();
                          toggleSelection(item.media_id);
                        }
                      }}
                      className={`relative w-full overflow-hidden rounded-xl bg-neutral-900 border transition-all duration-200 cursor-pointer group mb-4 ${
                        isItemSelected
                          ? "border-blue-500 ring-4 ring-blue-500/30 scale-[0.98]"
                          : "border-neutral-800 hover:border-neutral-600"
                      }`}
                    >
                      <div
                        className={`absolute top-2 left-2 z-30 transition-opacity ${
                          isItemSelected
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100 hidden md:block"
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

                      {item.type.startsWith("image/") ? (
                        <ImageItem
                          item={item}
                          priority={index < 12}
                        />
                      ) : (
                        <VideoItem item={item} />
                      )}
                    </div>
                  );
                })}
              </Masonry>
            </>
          )}
        </div>

        {/* Load More Spinner */}
        <LoadMoreSpinner targetRef={observerTarget} isLoading={isLoading} />
      </main>

      {/* --- VIEW CONTROLS --- */}
      {mediaItems.length > 0 && (
        <GridControls gridCols={gridCols} setGridCols={setGridCols} />
      )}

      {/* SCROLL TO TOP BUTTON */}
      <ScrollToTopButton />

      {/* --- MEDIA VIEW MODAL --- */}
      <ViewMediaModal
        mediaItems={mediaItems}
        selectedMediaIndex={selectedMediaIndex}
        onChangeSelectedMediaIndex={setSelectedMediaIndex}
      />
    </div>
  );
};

export default GalleryBin;
