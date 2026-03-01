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
    if (selectedMediaIndex === null) return;
    setSelectedMediaIndex((prev) =>
      prev !== null && prev < mediaItems.length - 1 ? prev + 1 : 0,
    );
  }, [mediaItems.length, selectedMediaIndex]);

  const handlePrev = useCallback(() => {
    if (selectedMediaIndex === null) return;
    setSelectedMediaIndex((prev) =>
      prev !== null && prev > 0 ? prev - 1 : mediaItems.length - 1,
    );
  }, [mediaItems.length, selectedMediaIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedMediaIndex === null) return;
      if (e.key === "Escape") setSelectedMediaIndex(null);
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "i" || e.key === "I") setShowInfo((prev) => !prev);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedMediaIndex, handleNext, handlePrev]);

  const selectedMedia =
    selectedMediaIndex !== null ? mediaItems[selectedMediaIndex] : null;

  return (
    selectedMedia && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md"
        onClick={() => setSelectedMediaIndex(null)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* --- CONTROLS --- */}
        <div className="absolute top-0 left-0 w-full p-4 md:p-6 flex justify-between items-center z-50 pointer-events-none">
          <div className="pointer-events-auto bg-black/40 backdrop-blur px-4 py-2 rounded-lg border border-white/10 text-white text-sm truncate max-w-[50%]">
            {selectedMedia.filename}
          </div>
          <div className="flex items-center gap-3 pointer-events-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowInfo(true);
              }}
              className={`p-3 rounded-full transition-all border border-white/5 cursor-pointer ${
                showInfo ? "bg-blue-600" : "bg-white/10 hover:bg-white/20"
              }`}
            >
              <InfoIcon />
            </button>
            <button
              onClick={handleDownload}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white cursor-pointer"
            >
              <DownloadIcon />
            </button>
            <button
              onClick={() => setSelectedMediaIndex(null)}
              className="p-3 bg-white/10 hover:bg-red-500/20 rounded-full text-white cursor-pointer"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* --- INFO --- */}
        <div
          className={`absolute right-0 top-0 h-full w-full md:w-80 bg-neutral-900/95 backdrop-blur-2xl z-100 border-l border-white/10 p-8 transition-transform duration-300 ${
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
          className="flex items-center justify-between w-full h-full px-4"
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
            {selectedMedia.type.startsWith("image/") ? (
              <div className="relative w-full h-full max-h-[85vh]">
                <img
                  alt={selectedMedia.filename}
                  src={`${CONSTANTS.SERVER_URL}/media/view/${selectedMedia.media_id}`}
                  className="object-contain shadow-2xl w-full max-h-[80vh]"
                  draggable={false}
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
          <button
            onClick={handleNext}
            className="p-4 rounded-full bg-neutral-800/50 hover:bg-neutral-700 text-white z-50 cursor-pointer hidden md:block"
          >
            <ChevronRight />
          </button>
        </div>
      </div>
    )
  );
};

export default ViewMediaModal;
