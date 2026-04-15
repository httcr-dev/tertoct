interface PageLoaderProps {
  message?: string;
  fullScreen?: boolean;
}

export function PageLoader({
  message = "Carregando...",
  fullScreen = true,
}: PageLoaderProps) {
  return (
    <div
      className={`${fullScreen ? "fixed inset-0 z-50" : "w-full min-h-[40vh]"} flex items-center justify-center bg-black`}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#c29b62] border-t-transparent" />
        <p className="text-sm text-zinc-400">{message}</p>
      </div>
    </div>
  );
}
