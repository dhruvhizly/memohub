"use client";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full animate-page-enter">
      {children}
      <style jsx global>{`
        @keyframes pageEnter {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: none;
          }
        }
        .animate-page-enter {
          animation: pageEnter 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}