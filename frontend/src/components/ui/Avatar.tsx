interface AvatarProps {
  src?: string | null;
  label: string;
  className?: string;
  textClassName?: string;
}

/** Circular avatar: shows the image if present, otherwise the app's theme color with an initial. */
export function Avatar({ src, label, className = "h-9 w-9", textClassName = "text-sm" }: AvatarProps) {
  const initial = label.trim().charAt(0).toUpperCase() || "?";

  if (src) {
    return (
      <div className={`overflow-hidden rounded-full ${className}`}>
        <img src={src} alt={label} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground ${className} ${textClassName}`}
    >
      {initial}
    </div>
  );
}
