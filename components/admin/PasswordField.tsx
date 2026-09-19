"use client";

import { useState } from "react";

export default function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="text-sm text-muted">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={id}
          type={visible ? "text" : "password"}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="focus-ring w-full rounded-md border border-line bg-white/60 px-3 py-2 pr-16 text-sm text-ink"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="focus-ring absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-ink"
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}
