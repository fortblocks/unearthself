export function GalleryNavButton({
  direction,
  onClick,
}: {
  direction: "previous" | "next";
  onClick: () => void;
}) {
  const previous = direction === "previous";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={previous ? "Previous image" : "Next image"}
      className={
        "absolute top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-coal/70 text-fossil transition-colors hover:bg-ember hover:text-white focus-visible:outline-2 focus-visible:outline-ember " +
        (previous ? "left-3" : "right-3")
      }
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d={previous ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
      </svg>
    </button>
  );
}
