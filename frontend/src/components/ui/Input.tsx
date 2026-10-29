import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Input({ label, id, className = "", required, ...rest }: InputProps) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5 text-left">
      <span className="text-sm font-medium text-ink">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <input
        id={id}
        required={required}
        className={`rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary ${className}`}
        {...rest}
      />
    </label>
  );
}
