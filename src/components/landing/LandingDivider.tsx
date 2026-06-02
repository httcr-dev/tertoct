export function LandingDivider({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`landing-rope-line mx-auto w-full max-w-md ${className}`}
      aria-hidden
    />
  );
}
