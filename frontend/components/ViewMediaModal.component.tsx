"use client";

import { formatSize } from "@/lib/functions";
import { CONSTANTS } from "@/lib/constants";
import {
  ChevronLeft,
  ChevronRight,
  CloseIcon,
  DownloadIcon,
  InfoIcon,
} from "@/lib/svg";
import { useEffect, useState, useCallback, useRef } from "react";
import { MediaItem } from "@/interfaces/media_response";
import Image from "next/image";

const DetailItem = ({ label, value }: { label: string; value: string }) => {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
        {label}
      </span>
      <span className="text-sm text-neutral-200 break-all">{value}</span>
    </div>
  );
};

interface ViewMediaModalProps {
  mediaItems: MediaItem[];
  selectedMediaIndex: number | null;
  onChangeSelectedMediaIndex: React.Dispatch<
    React.SetStateAction<number | null>
  >;
}

const ViewMediaModal = ({
  mediaItems,
  selectedMediaIndex,
  onChangeSelectedMediaIndex: setSelectedMediaIndex,
}: ViewMediaModalProps) => {
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const isDragging = useRef(false);
  const startPan = useRef({ x: 0, y: 0 });
  const initialPinch = useRef<{ dist: number; scale: number } | null>(null);
  const lastTapTime = useRef<number>(0);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const media =
      selectedMediaIndex !== null ? mediaItems[selectedMediaIndex] : null;
    if (!media) return;
    const link = document.createElement("a");
    link.href = `${CONSTANTS.SERVER_URL}/media/download/${media.media_id}`;
    link.setAttribute("download", media.filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };
  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50) handleNext();
    if (distance < -50) handlePrev();
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleNext = useCallback(() => {
    setDirection("right");
    if (selectedMediaIndex === null) return;
    setSelectedMediaIndex((prev) =>
      prev !== null && prev < mediaItems.length - 1 ? prev + 1 : 0,
    );
  }, [mediaItems.length, selectedMediaIndex, setSelectedMediaIndex]);

  const handlePrev = useCallback(() => {
    setDirection("left");
    if (selectedMediaIndex === null) return;
    setSelectedMediaIndex((prev) =>
      prev !== null && prev > 0 ? prev - 1 : mediaItems.length - 1,
    );
  }, [mediaItems.length, selectedMediaIndex, setSelectedMediaIndex]);

  useEffect(() => {
    setTransform({ scale: 1, x: 0, y: 0 });
  }, [selectedMediaIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedMediaIndex === null) return;
      if (e.key === "Escape") {
        if (showInfo) setShowInfo(false);
        else setSelectedMediaIndex(null);
        return;
      }
      if (e.key === "i" || e.key === "I") {
        setShowInfo((prev) => !prev);
        return;
      }
      if (showInfo) return;
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedMediaIndex, handleNext, handlePrev, showInfo]);

  const selectedMedia =
    selectedMediaIndex !== null ? mediaItems[selectedMediaIndex] : null;

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = -e.deltaY;
    if (delta === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    setTransform((prev) => {
      const scaleStep = 0.1;
      const newScale = Math.max(1, Math.min(prev.scale + (delta > 0 ? scaleStep : -scaleStep) * prev.scale, 5));

      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const mx = clientX - cx;
      const my = clientY - cy;

      const factor = newScale / prev.scale;
      const newX = mx - (mx - prev.x) * factor;
      const newY = my - (my - prev.y) * factor;

      return { scale: newScale, x: newScale === 1 ? 0 : newX, y: newScale === 1 ? 0 : newY };
    });
  };

  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (transform.scale > 1) {
      e.stopPropagation();
      e.preventDefault();
      isDragging.current = true;
      startPan.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
    }
  };

  const handleImageMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current && transform.scale > 1) {
      e.stopPropagation();
      e.preventDefault();
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - startPan.current.x,
        y: e.clientY - startPan.current.y,
      }));
    }
  };

  const handleImageMouseUp = () => {
    isDragging.current = false;
  };

  const handleDoubleTap = (clientX: number, clientY: number, rect: DOMRect) => {
    setTransform((prev) => {
      if (prev.scale > 1) {
        return { scale: 1, x: 0, y: 0 };
      }
      const newScale = 3;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const mx = clientX - cx;
      const my = clientY - cy;
      const newX = mx - mx * newScale;
      const newY = my - my * newScale;
      return { scale: newScale, x: newX, y: newY };
    });
  };

  const handleImageTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapTime.current < 300) {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const touch = e.touches[0];
        handleDoubleTap(touch.clientX, touch.clientY, rect);
        lastTapTime.current = 0;
        return;
      }
      lastTapTime.current = now;
    }

    if (e.touches.length === 2) {
      e.stopPropagation();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      initialPinch.current = { dist, scale: transform.scale };
    } else if (e.touches.length === 1 && transform.scale > 1) {
      e.stopPropagation();
      isDragging.current = true;
      startPan.current = { x: e.touches[0].clientX - transform.x, y: e.touches[0].clientY - transform.y };
    }
  };

  const handleImageTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinch.current) {
      e.stopPropagation();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const scaleFactor = dist / initialPinch.current.dist;
      const newScale = Math.max(1, Math.min(initialPinch.current.scale * scaleFactor, 5));

      const rect = e.currentTarget.getBoundingClientRect();
      const centerClientX = (t1.clientX + t2.clientX) / 2;
      const centerClientY = (t1.clientY + t2.clientY) / 2;

      setTransform((prev) => {
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const mx = centerClientX - cx;
        const my = centerClientY - cy;

        const factor = newScale / prev.scale;
        const newX = mx - (mx - prev.x) * factor;
        const newY = my - (my - prev.y) * factor;

        return { scale: newScale, x: newScale === 1 ? 0 : newX, y: newScale === 1 ? 0 : newY };
      });
    } else if (e.touches.length === 1 && isDragging.current && transform.scale > 1) {
      e.stopPropagation();
      setTransform((prev) => ({
        ...prev,
        x: e.touches[0].clientX - startPan.current.x,
        y: e.touches[0].clientY - startPan.current.y,
      }));
    }
  };

  const handleImageTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      initialPinch.current = null;
    }
    if (e.touches.length === 0) {
      isDragging.current = false;
    }
  };

  return (
    selectedMedia && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md animate-modal-enter"
        onClick={() => setSelectedMediaIndex(null)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* --- CONTROLS --- */}
        <div className="absolute top-0 left-0 w-full p-2 md:p-6 flex justify-between items-center z-50 pointer-events-none">
          <div className="pointer-events-auto bg-black/40 backdrop-blur px-3 py-1.5 md:px-4 md:py-2 rounded-lg border border-white/10 text-white text-xs md:text-sm truncate max-w-[50%]">
            {selectedMedia.filename}
          </div>
          <div className="flex items-center gap-2 md:gap-3 pointer-events-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowInfo(true);
              }}
              className={`p-2 md:p-3 rounded-full transition-all border border-white/5 cursor-pointer ${
                showInfo ? "bg-blue-600" : "bg-white/10 hover:bg-white/20"
              }`}
            >
              <InfoIcon />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 md:p-3 bg-white/10 hover:bg-white/20 rounded-full text-white cursor-pointer"
            >
              <DownloadIcon />
            </button>
            <button
              onClick={() => setSelectedMediaIndex(null)}
              className="p-2 md:p-3 bg-white/10 hover:bg-red-500/20 rounded-full text-white cursor-pointer"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* --- OVERLAY FOR INFO MODE --- */}
        {showInfo && (
          <div
            className="absolute inset-0 z-60 bg-black/60 cursor-default transition-opacity duration-300"
            onClick={(e) => {
              e.stopPropagation();
              setShowInfo(false);
            }}
          />
        )}

        {/* --- INFO --- */}
        <div
          className={`absolute right-0 top-0 h-full w-full md:w-80 bg-neutral-900/95 backdrop-blur-2xl z-100 border-l border-white/10 p-4 md:p-8 transition-transform duration-300 ${
            showInfo ? "translate-x-0" : "translate-x-full"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`flex justify-between items-center mb-8`}>
            <h3 className="text-xl font-bold">Details</h3>
            <button
              onClick={() => setShowInfo(false)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            >
              <CloseIcon />
            </button>
          </div>
          <div className="space-y-6">
            <DetailItem label="Filename" value={selectedMedia.filename} />
            <DetailItem label="Mime Type" value={selectedMedia.type} />
            <DetailItem
              label="Uploaded"
              value={new Date(selectedMedia.uploaded_at).toLocaleString()}
            />
            <DetailItem
              label="Size"
              value={formatSize(parseInt(selectedMedia.size))}
            />
          </div>
        </div>

        {/* --- MEDIA --- */}
        <div
          className="flex items-center justify-between w-full h-full px-0 md:px-4"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handlePrev}
            className="p-4 rounded-full bg-neutral-800/50 hover:bg-neutral-700 text-white z-50 cursor-pointer hidden md:block"
          >
            <ChevronLeft />
          </button>
          <div
            className={`flex-1 flex items-center justify-center transition-all duration-500 ${
              showInfo ? "md:pr-80 blur-sm opacity-50 scale-95" : ""
            }`}
          >
            <div
              key={selectedMedia.media_id}
              className={`w-full h-full flex items-center justify-center ${
                direction === "right"
                  ? "animate-slide-right"
                  : direction === "left"
                  ? "animate-slide-left"
                  : ""
              }`}
            >
              {selectedMedia.type.startsWith("image/") ? (
                <div
                  className="relative w-full h-full max-h-[85vh] flex items-center justify-center overflow-hidden"
                  style={{ touchAction: "none" }}
                  onWheel={handleWheel}
                  onMouseDown={handleImageMouseDown}
                  onMouseMove={handleImageMouseMove}
                  onMouseUp={handleImageMouseUp}
                  onMouseLeave={handleImageMouseUp}
                  onTouchStart={handleImageTouchStart}
                  onTouchMove={handleImageTouchMove}
                  onTouchEnd={handleImageTouchEnd}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    handleDoubleTap(e.clientX, e.clientY, rect);
                  }}
                >
                  <img
                    alt={selectedMedia.filename}
                    src={`${CONSTANTS.SERVER_URL}/media/view/${selectedMedia.media_id}`}
                    className="object-contain shadow-2xl w-full max-h-[80vh] transition-transform duration-75 ease-out"
                    draggable={false}
                    style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, cursor: transform.scale > 1 ? "grab" : "default" }}
                  />
                </div>
              ) : (
                <video
                  src={`${CONSTANTS.SERVER_URL}/media/view/${selectedMedia.media_id}`}
                  className="max-w-full max-h-[85vh] shadow-2xl"
                  controls
                  autoPlay
                  playsInline
                />
              )}
            </div>
          </div>
          <button
            onClick={handleNext}
            className="p-4 rounded-full bg-neutral-800/50 hover:bg-neutral-700 text-white z-50 cursor-pointer hidden md:block"
          >
            <ChevronRight />
          </button>
        </div>
        <style jsx>{`
          @keyframes modalEnter {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes slideInRight {
            from { opacity: 0; transform: translateX(40px); }
            to { opacity: 1; transform: translateX(0); }
          }
          @keyframes slideInLeft {
            from { opacity: 0; transform: translateX(-40px); }
            to { opacity: 1; transform: translateX(0); }
          }
          .animate-modal-enter {
            animation: modalEnter 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .animate-slide-right {
            animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .animate-slide-left {
            animation: slideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        `}</style>
      </div>
    )
  );
};

export default ViewMediaModal;
