"use client";

import { ConfirmationModalState } from "@/interfaces/common_interfaces";
import { useState } from "react";
import { createPortal } from "react-dom";

type ConfirmationModalProps = {state: ConfirmationModalState}; 

export const ConfirmationModal = ({state}: ConfirmationModalProps) => {
  const {title, subtext, confirmText, cancelText, onConfirm, onCancel} = state;
  const [wiggle, setWiggle] = useState(false);

  const triggerWiggle = () => {
    setWiggle(true);
    setTimeout(() => setWiggle(false), 400);
  };

  return (
    title && createPortal(<div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onMouseDown={triggerWiggle}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={`bg-black w-[90%] max-w-md rounded-2xl shadow-xl p-6 transition-transform ${
          wiggle ? "animate-wiggle" : ""
        }`}
      >
        <h2 className="text-lg font-bold text-white mb-2">
          {title}
        </h2>
        <h5 className="text-sm font-semibold text-gray-400 mb-6">
          {subtext}
        </h5>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-700 transition font-semibold cursor-pointer"
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition font-semibold cursor-pointer"
          >
            {confirmText}
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes wiggle {
          0% {
            transform: rotate(0deg);
          }
          20% {
            transform: rotate(-3deg);
          }
          40% {
            transform: rotate(3deg);
          }
          60% {
            transform: rotate(-3deg);
          }
          80% {
            transform: rotate(3deg);
          }
          100% {
            transform: rotate(0deg);
          }
        }

        .animate-wiggle {
          animation: wiggle 0.35s ease-in-out;
        }
      `}</style>
    </div>, document.body)
  );
}
