import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary";
}

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-gradient-to-b from-primary to-primary-hover text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40",
  secondary:
    "bg-surface text-ink border border-border shadow-sm hover:bg-surface-muted",
};

export function Button({
  children,
  variant = "primary",
  className = "",
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-150 enabled:hover:-translate-y-0.5 enabled:active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
