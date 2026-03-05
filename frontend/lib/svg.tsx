export const CloseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className="w-8 h-8"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

export const ChevronLeft = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2.5}
    stroke="currentColor"
    className="w-8 h-8 md:w-10 md:h-10"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 19.5L8.25 12l7.5-7.5"
    />
  </svg>
);

export const ChevronRight = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2.5}
    stroke="currentColor"
    className="w-8 h-8 md:w-10 md:h-10"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8.25 4.5l7.5 7.5-7.5 7.5"
    />
  </svg>
);

export const DownloadIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-8 h-8"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <line x1="12" y1="3" x2="12" y2="15" />
    <polyline points="7 10 12 15 17 10" />
  </svg>
);

export const ScrollToTopIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={3}
    stroke="currentColor"
    className="w-5 h-5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.5 15.75l7.5-7.5 7.5 7.5"
    />
  </svg>
);

export const CheckBoxTickIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
    <path
      fillRule="evenodd"
      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
      clipRule="evenodd"
    />
  </svg>
);

export const PlayVideoIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="w-10 h-10 drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)]"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="11" fill="rgba(0,0,0,0.55)" />
    <path
      d="M9 7.8c0-1.05 1.15-1.7 2.05-1.22l6.2 3.6c0.95.55 0.95 1.9 0 2.45l-6.2 3.6c-.9.48-2.05-.17-2.05-1.22V7.8z"
      fill="white"
      stroke="black"
      strokeWidth="1"
      strokeLinejoin="round"
    />
  </svg>
);

export const InfoIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className="w-8 h-8 text-white"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
    />
  </svg>
);

export const GhostIcon = () => (
  <svg
    width="160"
    height="160"
    viewBox="0 0 160 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M40 66C40 43.9 57.9 26 80 26C102.1 26 120 43.9 120 66V124
       C120 128 116 132 112 132
       C108 132 104 128 100 128
       C96 128 92 132 88 132
       C84 132 80 128 76 128
       C72 128 68 132 64 132
       C60 132 56 128 52 128
       C48 128 44 132 40 132Z"
      fill="#F3F4F6"
      stroke="#E5E7EB"
      strokeWidth="2"
    />
    <circle cx="64" cy="76" r="6" fill="#9CA3AF" />
    <circle cx="96" cy="76" r="6" fill="#9CA3AF" />
    <path
      d="M72 96C78 94 82 94 88 96"
      stroke="#9CA3AF"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

export const UploadingLoader = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="16" height="16" fill="none">
    <circle cx="32" cy="32" r="26" stroke="white" strokeWidth="12" strokeOpacity="0.2"/>
    <circle cx="32" cy="32" r="26" stroke="white" strokeWidth="12"
      strokeLinecap="round"
      strokeDasharray="60 104"
      strokeDashoffset="0">
      <animateTransform
        attributeName="transform"
        type="rotate"
        from="0 32 32"
        to="360 32 32"
        dur="0.9s"
        repeatCount="indefinite"/>
    </circle>
  </svg>
)
