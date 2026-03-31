"use client";

import { useEffect, useState } from "react";
import { listenPublicFeedbacks, type Feedback } from "@/services/feedbackService";

export function FeedbackWall() {
  const [items, setItems] = useState<Feedback[]>([]);

  useEffect(() => {
    const unsub = listenPublicFeedbacks(setItems, () => setItems([]));
    return () => unsub();
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="mt-24 mb-10">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-400">
            Recados dos alunos
          </p>
          <h2 className="mt-2 text-2xl font-black text-zinc-100">
            Feedbacks da comunidade
          </h2>
        </div>
        <p className="text-xs text-zinc-500 max-w-[340px] hidden sm:block">
          Mensagens curtas enviadas por alunos com plano ativo.
        </p>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {items.slice(0, 12).map((f) => (
          <div
            key={f.id}
            className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-4 backdrop-blur-sm"
          >
            <p className="text-sm text-zinc-100 leading-relaxed break-words">
              “{f.message}”
            </p>
            <p className="mt-3 text-xs text-zinc-500">
              — {f.userName?.trim() || "Aluno"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

