"use client";

import { useState } from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement>;

/** Password field with a Show/Hide visibility toggle. */
export default function PasswordInput({ className, ...props }: Props) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        type={show ? "text" : "password"}
        className={`w-full rounded-lg border border-slate-300 px-3 py-2 pr-16 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 ${
          className ?? ""
        }`}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-xs font-medium text-slate-400 hover:text-slate-600"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}
