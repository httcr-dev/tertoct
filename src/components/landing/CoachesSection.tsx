"use client";

import Image from "next/image";

interface CoachCardData {
  id: string;
  name: string | null;
  bio?: string | null;
  photoURL?: string | null;
}

interface CoachesSectionProps {
  coaches: CoachCardData[];
}

export function CoachesSection({ coaches }: CoachesSectionProps) {
  if (coaches.length === 0) return null;

  return (
    <section id="coaches" className="mt-28 flex w-full flex-col items-center">
      <p className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-[#c29b62]">
        Treine com os melhores
      </p>
      <h2 className="mb-4 text-3xl font-black text-zinc-100 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] sm:text-4xl">
        Nossa Equipe
      </h2>
      <p className="mb-14 max-w-md text-center text-sm text-zinc-400">
        Instrutores experientes e dedicados à sua evolução no boxe.
      </p>

      <div className="flex w-full flex-wrap justify-center gap-8">
        {coaches.map((coach, index) => (
          <div
            key={coach.id}
            className="group relative flex w-full max-w-xs flex-col items-center rounded-2xl border border-[#c29b62]/15 bg-gradient-to-br from-zinc-900/80 to-black/80 p-8 pt-10 text-center backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-[#c29b62]/50 hover:shadow-[0_0_40px_rgba(194,155,98,0.12)]"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Glow */}
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-[#c29b62]/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

            {/* Avatar */}
            <div className="relative mb-5 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-[#c29b62]/60 bg-gradient-to-br from-zinc-800 to-zinc-900 text-2xl font-black uppercase text-[#c29b62] shadow-[0_0_20px_rgba(194,155,98,0.2)] transition-shadow duration-500 group-hover:shadow-[0_0_30px_rgba(194,155,98,0.35)]">
              {coach.photoURL ? (
                <Image
                  src={coach.photoURL}
                  alt={coach.name || ""}
                  width={96}
                  height={96}
                  className="block h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                  unoptimized
                />
              ) : (
                coach.name
                  ?.split(" ")
                  .map((part: string) => part.charAt(0))
                  .join("")
                  .slice(0, 2) || "TR"
              )}
            </div>

            {/* Info */}
            <div className="relative">
              <p className="text-lg font-bold tracking-tight text-zinc-100">
                {coach.name}
              </p>
              <p className="mt-2 text-sm font-medium text-[#c29b62]/80">
                {coach.bio || "Instrutor Especializado"}
              </p>
            </div>

            {/* Decorative line */}
            <div className="mt-6 h-px w-16 bg-gradient-to-r from-transparent via-[#c29b62]/40 to-transparent" />
          </div>
        ))}
      </div>
    </section>
  );
}
