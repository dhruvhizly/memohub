"use client";
import axios from "axios";
import { createPortal } from "react-dom";
import { CONSTANTS } from "@/lib/constants";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  CheckBoxTickIcon,
  CloseIcon,
  GhostIcon,
  Logo,
  UploadingLoader,
} from "@/lib/svg";
import { ConfirmationModalState } from "@/interfaces/common_interfaces";
import { ViewMediaModal } from "@/components/ViewMediaModal.component";
import { VideoItem } from "@/components/VideoItem.component";
import { ImageItem } from "@/components/ImageItem.component";
import { ConfirmationModal } from "@/components/ConfirmationModal.component";
import { UserModal } from "@/components/UserModal.component";
import {
  GRID_MODE_STYLES,
  GallerySkeleton,
  GridControls,
  GridMode,
  LoadMoreSpinner,
  ScrollToTopButton,
} from "@/components/GalleryCommon.component";
import {
  GroupedMediaItem,
  GroupedMediaResponse,
  MediaItem,
} from "@/interfaces/media_response";
import { useColumnCount } from "@/hooks/useColumnCount.hook";

// --- MAIN COMPONENT ---
const GalleryGrid = () => {
  const [groupedMediaItems, setGroupedMediaItems] = useState<
    Array<GroupedMediaItem>
  >([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [gridCols, setGridCols] = useState<GridMode>("Compact");
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(
    null,
  );
  const [mounted, setMounted] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const isSelectionMode = selectedIds.size > 0;
  const flatMediaItems = useMemo(
    () => groupedMediaItems.flatMap(({ label, items }) => items),
    [groupedMediaItems],
  );
  const [confirmationModalState, setConfirmationModalState] =
    useState<ConfirmationModalState>({
      title: "",
      confirmText: "",
      cancelText: "",
      onConfirm: () => {},
      onCancel: () => {},
    });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const columnCount = useColumnCount(gridCols);

  const gridRows = useMemo(() => {
    const rows: (
      | { type: "header"; label: string; items: MediaItem[] }
      | { type: "media"; items: MediaItem[] }
    )[] = [];
    groupedMediaItems.forEach((group) => {
      rows.push({ type: "header", label: group.label, items: group.items });
      if (group.items.length > 0) {
        let currentRow: MediaItem[] = [];
        let currentAspectSum = 0;

        for (let i = 0; i < group.items.length; i++) {
          const item = group.items[i];
          const w = Number((item as any).width);
          const h = Number((item as any).height);
          const aspect = w > 0 && h > 0 ? w / h : 1;

          currentRow.push(item);
          currentAspectSum += aspect;

          if (currentAspectSum >= columnCount || i === group.items.length - 1) {
            rows.push({
              type: "media",
              items: currentRow,
            });
            currentRow = [];
            currentAspectSum = 0;
          }
        }
      }
    });
    return rows;
  }, [groupedMediaItems, columnCount]);

  const rowVirtualizer = useVirtualizer({
    count: hasMore ? gridRows.length + 1 : gridRows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: useCallback(
      (index) => {
        if (gridRows[index]?.type === "header") return 48;
        return GRID_MODE_STYLES[gridCols].estimateHeight;
      },
      [gridRows, gridCols],
    ),
    overscan: 3,
    measureElement:
      typeof window !== "undefined" &&
      navigator.userAgent.indexOf("Firefox") === -1
        ? (element) => element.getBoundingClientRect().height
        : undefined,
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

  const toggleGroupSelection = (items: MediaItem[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = items.every((item) => next.has(item.media_id));

      if (allSelected) {
        items.forEach((item) => next.delete(item.media_id));
      } else {
        items.forEach((item) => next.add(item.media_id));
      }
      return next;
    });
  };

  const handleDeleteSelected = () => {
    const moveItemsToBin = async () => {
      closeConfirmationModal();
      try {
        const endpoint = `${CONSTANTS.SERVER_URL}/bin/`;
        const res = await axios.post(
          endpoint,
          { media_ids: Array.from(selectedIds) },
          {
            withCredentials: true,
          },
        );

        if (res.data.status === "success") {
          const binnedIds = new Set(res.data.binned);
          setGroupedMediaItems((prev) =>
            prev
              .map(({ label, items }) => ({
                label,
                items: items.filter((item) => !binnedIds.has(item.media_id)),
              }))
              .filter(({ items }) => items.length > 0),
          );
          setSelectedIds(new Set());
        }
      } catch (err: any) {
        console.error("Failed to move items to bin:", err);
        alert(err.response?.data?.detail || "Failed to move items to bin");
      }
    };

    const count = selectedIds.size;
    setConfirmationModalState({
      title: `Are you sure you want to move ${count} item(s) to bin?`,
      confirmText: "Move",
      cancelText: "Cancel",
      onConfirm: moveItemsToBin,
      onCancel: closeConfirmationModal,
    });
  };

  const openModal = (id: string) => {
    const index = flatMediaItems.findIndex((m) => m.media_id === id);
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
        const endpoint = new URL("/media", CONSTANTS.SERVER_URL);
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

          if (
            lastGroup &&
            firstNewGroup &&
            lastGroup.label === firstNewGroup.label
          ) {
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
    setMounted(true);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    const virtualItems = rowVirtualizer.getVirtualItems();
    if (virtualItems.length === 0) return;
    const lastItem = virtualItems[virtualItems.length - 1];
    if (!lastItem) return;

    if (lastItem.index >= gridRows.length - 1 && hasMore && !isLoading) {
      fetchMedia(page + 1);
    }
  }, [
    rowVirtualizer.getVirtualItems(),
    gridRows.length,
    hasMore,
    isLoading,
    fetchMedia,
    page,
  ]);

  useEffect(() => {
    document.body.style.overflow =
      selectedMediaIndex !== null ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [selectedMediaIndex]);

  return (
    <div className="h-screen w-full flex flex-col items-center bg-neutral-950 text-neutral-200 relative">
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
            <button
              onClick={handleDeleteSelected}
              className="bg-blue-500 hover:bg-blue-400 px-4 md:px-6 py-2 rounded-xl font-bold transition-all active:scale-95 shadow-lg cursor-pointer text-sm md:text-base"
            >
              Move to Bin
            </button>
          </div>,
          document.body,
        )}

      {/* --- HEADER --- */}
      <header className="sticky top-0 w-full z-40 bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-900 px-2 py-2 md:px-4 md:py-4">
        <div className="mx-auto flex flex-row justify-between items-center gap-2 md:gap-4">
          <h1
            className="text-xl md:text-3xl flex gap-3 justify-center items-center font-extrabold tracking-tight cursor-pointer text-white hover:text-blue-400 transition-colors"
            onClick={() => window.location.reload()}
          >
            <span>
              <Logo />
            </span>
            <span>MemoHub</span>
          </h1>
          <div className="flex flex-wrap justify-center gap-2 md:gap-3 items-center">
            <label
              htmlFor="upload-input"
              className="relative px-3 py-2 md:py-2.5 rounded-xl font-bold overflow-hidden cursor-pointer bg-blue-600 text-white shadow-lg hover:bg-blue-500 active:scale-95 transition-all flex gap-2 md:gap-2.5 justify-center items-center"
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
              <span className="relative z-10 text-xs md:text-sm whitespace-nowrap">
                {isUploading ? (
                  `${uploadProgress}%`
                ) : (
                  <>
                    <span className="hidden sm:inline">Upload Media</span>
                    <span className="sm:hidden">Upload</span>
                  </>
                )}
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
            <UserModal />
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main
        ref={scrollContainerRef}
        className="w-full flex-1 overflow-y-auto px-2 md:px-4 pt-4 md:pt-8 pb-32"
      >
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
            /* 3. VIRUALIZED GRID STATE */
            <div
              ref={parentRef}
              style={{
                width: "100%",
                height: rowVirtualizer.getTotalSize(),
                position: "relative",
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = gridRows[virtualRow.index];
                if (!row) return null;

                if (row.type === "header") {
                  const allSelected = row.items.every((i) =>
                    selectedIds.has(i.media_id),
                  );
                  const someSelected = row.items.some((i) =>
                    selectedIds.has(i.media_id),
                  );
                  const isIndeterminate = someSelected && !allSelected;
                  return (
                    <div
                      key={row.label}
                      data-index={virtualRow.index}
                      ref={rowVirtualizer.measureElement}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <div className="flex items-center gap-3 py-1 border-l-4 border-blue-600 pl-3 my-4">
                        {isSelectionMode && (
                          <button
                            onClick={() => toggleGroupSelection(row.items)}
                            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors cursor-pointer ${allSelected || isIndeterminate ? "bg-blue-600 border-blue-600" : "border-neutral-600 hover:border-neutral-400"}`}
                          >
                            {allSelected && <CheckBoxTickIcon />}
                            {isIndeterminate && (
                              <div className="w-3 h-0.5 bg-white rounded-full" />
                            )}
                          </button>
                        )}
                        <h2 className="text-md font-bold text-neutral-400">
                          {row.label}
                        </h2>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualRow.start}px)`,
                      display: "flex",
                      gap: "16px",
                      paddingBottom: "16px",
                    }}
                  >
                    {row.items.map((item) => {
                      const isItemSelected = selectedIds.has(item.media_id);
                      const w = Number((item as any).width);
                      const h = Number((item as any).height);
                      const aspect = w > 0 && h > 0 ? w / h : 1;

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
                            style={{ flexGrow: aspect, flexShrink: 1, flexBasis: "0%" }}
                            className={`relative ${GRID_MODE_STYLES[gridCols].itemClass} overflow-hidden rounded-xl bg-neutral-900 border transition-all duration-200 cursor-pointer group ${isItemSelected ? "border-blue-500 ring-4 ring-blue-500/30 scale-[0.98]" : "border-neutral-800 hover:border-neutral-600"}`}
                        >
                          <div
                            className={`absolute top-2 left-2 z-30 transition-opacity ${isItemSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100 hidden md:block"}`}
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
                              priority={virtualRow.index < 5}
                            />
                          ) : (
                            <VideoItem item={item} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Load More Spinner */}
        <LoadMoreSpinner isLoading={isLoading && hasMore} />
      </main>

      {/* --- VIEW CONTROLS --- */}
      {groupedMediaItems.length > 0 && (
        <GridControls gridCols={gridCols} setGridCols={setGridCols} />
      )}

      {/* SCROLL TO TOP BUTTON */}
      <ScrollToTopButton scrollRef={scrollContainerRef} />

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
