"use client";

import { useEffect, useState } from "react";
import {
  fetchPublicFeedbacks,
  type PublicFeedbackItem,
} from "@/services/feedbackService";
export function FeedbackWall() {
  const [items, setItems] = useState<PublicFeedbackItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchPublicFeedbacks()
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="landing-section">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="text-left">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#c29b62]">
            Recados dos alunos
          </p>
          <h2 className="mt-2 text-xl font-black text-zinc-100 sm:text-2xl">
            Feedbacks da comunidade
          </h2>
        </div>
        <p className="text-xs leading-relaxed text-zinc-500 sm:max-w-[280px] sm:pb-1 sm:text-right">
          Mensagens enviadas por alunos ativos.
        </p>
      </header>

      <ul className="mt-5 grid grid-cols-1 gap-3 sm:mt-6 md:grid-cols-2">
        {items.slice(0, 12).map((f) => (
          <li
            key={f.id}
            className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-4 backdrop-blur-sm"
          >
            <blockquote className="text-sm leading-relaxed text-zinc-100 break-words">
              “{f.message}”
            </blockquote>
            <p className="mt-3 text-xs text-zinc-500">
              — {f.userName?.trim() || "Aluno"}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
