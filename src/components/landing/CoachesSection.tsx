"use client";

import Image from "next/image";
import { LandingSectionHeading } from "./LandingSectionHeading";

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
    <section
      id="coaches"
      className="landing-section flex w-full flex-col items-center"
    >
      <LandingSectionHeading
        eyebrow="Treine com os melhores"
        title="Nossa Equipe"
        description="Instrutores experientes e dedicados à sua evolução no boxe."
        className="mb-8 sm:mb-10"
      />

      <ul className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8">
        {coaches.map((coach) => (
          <li
            key={coach.id}
            className="group relative flex flex-col items-center rounded-2xl border border-[#c29b62]/15 bg-gradient-to-br from-zinc-900/80 to-black/80 p-6 pt-8 text-center backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-[#c29b62]/50 hover:shadow-[0_0_40px_rgba(194,155,98,0.12)] sm:p-8 sm:pt-10"
          >
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-[#c29b62]/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

            <div className="relative mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-[#c29b62]/60 bg-gradient-to-br from-zinc-800 to-zinc-900 text-xl font-black uppercase text-[#c29b62] shadow-[0_0_20px_rgba(194,155,98,0.2)] transition-shadow duration-300 group-hover:shadow-[0_0_30px_rgba(194,155,98,0.35)] sm:mb-5 sm:h-24 sm:w-24 sm:text-2xl">
              {coach.photoURL ? (
                <Image
                  src={coach.photoURL}
                  alt=""
                  width={96}
                  height={96}
                  sizes="96px"
                  className="block h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                coach.name
                  ?.split(" ")
                  .map((part) => part.charAt(0))
                  .join("")
                  .slice(0, 2) || "TR"
              )}
            </div>

            <div className="relative min-w-0">
              <p className="text-base font-bold tracking-tight text-zinc-100 sm:text-lg">
                {coach.name}
              </p>
              <p className="mt-1.5 text-sm font-medium text-[#c29b62]/80 line-clamp-3 sm:mt-2">
                {coach.bio || "Instrutor especializado"}
              </p>
            </div>

            <div
              className="mt-5 h-px w-16 bg-gradient-to-r from-transparent via-[#c29b62]/40 to-transparent sm:mt-6"
              aria-hidden
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
