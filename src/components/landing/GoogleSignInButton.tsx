import Image from "next/image";

export function GoogleSignInButton({
  onClick,
  className = "",
  testId,
  label = "Login com Google",
}: {
  onClick: () => void;
  className?: string;
  testId?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={`flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-zinc-600/80 bg-zinc-900/80 px-6 py-4 text-sm font-semibold text-zinc-100 shadow-[0_0_20px_rgba(0,0,0,0.4)] backdrop-blur-sm transition-all hover:border-zinc-500 hover:bg-zinc-800 hover:-translate-y-0.5 active:scale-[0.98] sm:w-auto sm:px-8 ${className}`}
    >
      <Image src="/google-logo.svg" alt="" width={20} height={20} aria-hidden />
      <span>{label}</span>
    </button>
  );
}
