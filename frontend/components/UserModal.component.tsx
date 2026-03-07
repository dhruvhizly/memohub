"use client";

import { CONSTANTS } from "@/lib/constants";
import { useUserId, useUserName } from "@/lib/store";
import axios from "axios";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

export const UserModal = () => {
  const { userid, setUserId } = useUserId((s) => s);
  const { username, setUsername } = useUserName((s) => s);
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);

  const handleLogout = async () => {
    setUserId("");
    setUsername("");
    setIsOpen(false);
    try {
      const endpoint = new URL("/auth/logout", CONSTANTS.SERVER_URL);

      const res = await axios.post(
        endpoint.toString(),
        {},
        {
          withCredentials: true,
        },
      );
      const success = res.data;
      if (!success) {
        console.error("Logout failed: Server responded with failure");
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 12,
        right: window.innerWidth - rect.right,
      });
    }
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white hover:border-neutral-500 transition-all cursor-pointer font-bold select-none"
      >
        {username ? username.charAt(0).toUpperCase() : "?"}
      </button>

      {isOpen && menuPos && createPortal(
        <>
          <div
            className="fixed inset-0 z-90"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="fixed w-64 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl p-4 z-100 flex flex-col gap-4 animate-fade-in origin-top-right"
            style={{ top: menuPos.top, right: menuPos.right }}
          >
            <div className="flex flex-col gap-3 border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-linear-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white font-bold text-xl shadow-inner ring-2 ring-white/10">
                  {username ? username.charAt(0).toUpperCase() : "?"}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-white truncate leading-tight" title={username}>
                    {username}
                  </span>
                  <span className="text-xs text-neutral-500 font-medium">
                    Member
                  </span>
                </div>
              </div>
              <div className="group relative bg-black/20 rounded-lg p-2.5 border border-neutral-800 hover:border-neutral-700 transition-colors mt-1">
                <span className="absolute -top-2 left-2 px-1 bg-neutral-900 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                  User ID
                </span>
                <p className="text-xs text-neutral-400 font-mono truncate select-all pt-1" title={userid}>
                  {userid}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white font-bold text-sm transition-colors cursor-pointer"
            >
              Logout
            </button>
          </div>
        </>,
        document.body
      )}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
