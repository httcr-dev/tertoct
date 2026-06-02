export function LandingSectionHeading({
  eyebrow,
  title,
  description,
  className = "",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <header className={`flex flex-col items-center text-center ${className}`}>
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#c29b62] sm:text-sm sm:tracking-[0.25em]">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-black text-zinc-100 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] sm:mt-3 sm:text-3xl lg:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-400 sm:mt-4">
          {description}
        </p>
      )}
    </header>
  );
}
