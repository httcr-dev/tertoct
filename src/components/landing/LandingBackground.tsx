import Image from "next/image";

export function LandingBackground() {
  return (
    <div className="fixed inset-0 z-0" aria-hidden>
      <Image
        src="/BlessTraining_Boxe_2026-03-15_532.jpg"
        alt=""
        fill
        priority
        quality={75}
        sizes="100vw"
        className="object-cover object-[center_30%] brightness-[1.08] contrast-[1.05] opacity-75 saturate-[1.12] sm:object-center sm:opacity-80 sm:brightness-110"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/40 to-black/85" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/15 to-black/30 sm:from-black/45 sm:via-transparent sm:to-black/25" />
      <div
        className="absolute -right-16 top-0 h-[min(400px,60vh)] w-[min(400px,70vw)] rounded-full bg-[radial-gradient(circle,rgba(194,155,98,0.12)_0%,transparent_70%)] blur-3xl sm:-right-20 sm:h-[min(520px,75vh)] sm:w-[min(520px,75vw)]"
        aria-hidden
      />
      <div className="absolute bottom-0 left-0 right-0 landing-rope-line" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.45)_100%)] sm:bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.35)_100%)]" />
    </div>
  );
}
