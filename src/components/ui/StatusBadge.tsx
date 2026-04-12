"use client";

import { useEffect, useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

interface StatusBadgeProps {
  status: Status;
  successMessage?: string;
  errorMessage?: string;
}

export function StatusBadge({
  status,
  successMessage = "Feito!",
  errorMessage = "Erro. Tente novamente.",
}: StatusBadgeProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status === "success" || status === "error") {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 2500);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [status]);

  if (!visible) return null;

  const isSuccess = status === "success";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all animate-in fade-in duration-300 ${
        isSuccess
          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
          : "bg-red-500/15 text-red-400 border border-red-500/30"
      }`}
    >
      {isSuccess ? (
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      )}
      {isSuccess ? successMessage : errorMessage}
    </span>
  );
}
