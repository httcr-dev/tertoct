"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  type DocumentData,
} from "firebase/firestore";
import { useAuth } from "@/components/auth/AuthProvider";
import { getFirestoreDb } from "@/lib/firebase";
import type { Plan } from "@/lib/types";
import { PlansSection } from "@/components/landing/PlansSection";
import { CoachesSection } from "@/components/landing/CoachesSection";

interface CoachCardData {
  id: string;
  name: string | null;
  bio?: string | null;
  photoURL?: string | null;
}

export default function Home() {
  const router = useRouter();
  const { profile, loading, signInWithGoogle } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [coaches, setCoaches] = useState<CoachCardData[]>([]);
  const [loadingLandingData, setLoadingLandingData] = useState(true);

  useEffect(() => {
    if (!loading && profile) {
      router.replace("/dashboard");
    }
  }, [loading, profile, router]);

  useEffect(() => {
    const db = getFirestoreDb();

    const load = async () => {
      try {
        const plansQuery = query(
          collection(db, "plans"),
          where("active", "==", true),
        );
        const plansSnap = await getDocs(plansQuery);
        const loadedPlans: Plan[] = [];
        plansSnap.forEach((docSnap) => {
          const data = docSnap.data() as DocumentData;
          loadedPlans.push({
            id: docSnap.id,
            name: data.name as string,
            price: data.price as number,
            classesPerWeek: data.classesPerWeek as number,
            description: (data.description as string | undefined) ?? undefined,
            active: (data.active as boolean | undefined) ?? true,
          });
        });
        loadedPlans.sort((a, b) => a.classesPerWeek - b.classesPerWeek);

        const coachesQuery = query(
          collection(db, "users"),
          where("role", "in", ["coach", "admin"]),
        );
        const coachesSnap = await getDocs(coachesQuery);
        const loadedCoaches: CoachCardData[] = [];
        coachesSnap.forEach((docSnap) => {
          const data = docSnap.data() as DocumentData;
          if (data.active !== false) {
            loadedCoaches.push({
              id: docSnap.id,
              name: (data.name as string | null | undefined) ?? null,
              bio: (data.bio as string | null | undefined) ?? undefined,
              photoURL:
                (data.photoURL as string | null | undefined) ?? undefined,
            });
          }
        });

        setPlans(loadedPlans);
        setCoaches(loadedCoaches);
      } finally {
        setLoadingLandingData(false);
      }
    };

    load().catch(() => {
      setLoadingLandingData(false);
    });
  }, []);

  return (
    <div className="relative min-h-screen bg-black text-zinc-50 overflow-hidden font-sans">
      {/* LOADING SCREEN - Show while auth is initializing or redirecting */}
      {(loading || profile) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#c29b62] border-t-transparent" />
            <p className="text-sm text-zinc-400">
              {profile ? "Redirecionando..." : "Carregando..."}
            </p>
          </div>
        </div>
      )}

      {/* Hide content while loading or redirecting */}
      {!loading && !profile && (
        <>
          {/* BACKGROUND IMAGE & OVERLAYS */}
          <div className="fixed inset-0 z-0">
            <Image
              src="/hero-tiago.png"
              alt="TertoCT Boxe Background"
              fill
              priority
              quality={100}
              unoptimized
              className="object-cover object-top opacity-50 mix-blend-lighten"
            />
            {/* Gradients para escurecer as bordas e a base */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-black/95" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none" />
          </div>

          <main className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-8 pt-8 lg:px-8">
            {/* HEADER */}
            <header className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/logo-academy.png"
                  alt="TertoCT Logo"
                  className="h-10 w-10 object-contain"
                />
                <span className="font-bold text-zinc-100 tracking-wide text-2xl">
                  TertoCT
                </span>
              </div>

              <nav className="hidden items-center gap-8 text-sm font-medium text-zinc-300 md:flex">
                <a href="#plans" className="transition hover:text-[#c29b62]">
                  Planos
                </a>
                <a href="#coaches" className="transition hover:text-[#c29b62]">
                  Professores
                </a>
                <a href="#contact" className="transition hover:text-[#c29b62]">
                  Contato
                </a>
                <button
                  onClick={signInWithGoogle}
                  className="ml-4 cursor-pointer rounded-md bg-[#c29b62] px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-[#d4b075] shadow-[0_0_15px_rgba(194,155,98,0.4)]"
                >
                  Entrar com conta Google
                </button>
              </nav>

              <button
                onClick={signInWithGoogle}
                className="md:hidden flex cursor-pointer items-center gap-2 rounded-md bg-[#c29b62] px-4 py-2 text-sm font-medium text-black transition hover:bg-[#d4b075]"
              >
                <span>Entrar</span>
              </button>
            </header>

            {/* HERO SECTION */}
            <section className="mt-20 flex flex-1 flex-col items-center justify-center text-center space-y-6 lg:mt-28">
              <h1 className="max-w-4xl text-5xl font-black uppercase leading-[1.1] tracking-wide text-zinc-100 sm:text-6xl lg:text-[5rem] drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
                Treino de boxe focado
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e6c687] via-[#c29b62] to-[#9c753b]">
                  em saúde, desempenho!
                </span>
                <br />e disciplina
              </h1>
              <p className="max-w-2xl text-base text-zinc-300 sm:text-lg drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] mt-6">
                Entre em forma de maneira intensa e focada.
                <br className="hidden sm:block" /> Agende uma aula experimental!
              </p>

              <button
                onClick={signInWithGoogle}
                className="mt-8 flex cursor-pointer items-center gap-3 rounded-md bg-zinc-100 px-8 py-3.5 text-base font-semibold text-zinc-900 shadow-[0_0_25px_rgba(255,255,255,0.15)] transition hover:bg-white hover:scale-[1.02]"
              >
                <Image
                  src="/google-logo.svg"
                  alt="Google"
                  width={20}
                  height={20}
                />
                <span>Login com Google</span>
              </button>
            </section>

            {/* NOSSOS PLANOS */}
            <PlansSection
              plans={plans}
              loadingLandingData={loadingLandingData}
            />

            {/* NOSSA EQUIPE */}
            <CoachesSection coaches={coaches} />

            {/* CALL TO ACTION BOTTOM */}
            <section
              id="contact"
              className="mt-32 mb-20 flex flex-col items-center text-center"
            >
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-100 drop-shadow-md">
                Pronto para transformar suas
              </p>
              <h2 className="mt-2 text-3xl font-black text-[#c29b62] sm:text-4xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                METAS EM REALIDADE?
              </h2>
              <a
                href="https://wa.me/554499771761?text=Ol%C3%A1!%20Gostaria%20de%20agendar%20uma%20aula%20experimental%20de%20boxe."
                target="_blank"
                rel="noopener noreferrer"
                className="mt-10 cursor-pointer inline-block rounded-md bg-[#c29b62] px-10 py-4 text-sm font-bold uppercase tracking-wider text-black shadow-[0_0_20px_rgba(194,155,98,0.3)] transition hover:bg-[#d4b075] hover:-translate-y-1"
              >
                Agendar Aula Experimental
              </a>
            </section>

            {/* Footer moved to RootLayout to avoid duplicate/dynamic rendering */}
          </main>
        </>
      )}
    </div>
  );
}
