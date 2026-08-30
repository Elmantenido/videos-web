"use client";

import type { ReactNode } from "react";

type Props = {
  confirmMessage: string;
  className?: string;
  children: ReactNode;
};

export default function ConfirmSubmitButton({ confirmMessage, className, children }: Props) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
