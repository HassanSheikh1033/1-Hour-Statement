"use client";

import { useEffect, useId, useRef } from "react";

interface ModalProps {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  side?: boolean;
  wide?: boolean;
}

const FOCUSABLE = 'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

/** Accessible dialog (modal or right-side drawer): Esc closes, focus is trapped and restored. */
export function Modal({ title, description, onClose, children, side, wide }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    node?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    if (node && !node.contains(document.activeElement)) node.focus();
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 flex bg-black/50 backdrop-blur-sm ${side ? "justify-end" : "items-end justify-center sm:items-center sm:p-4"}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`card flex max-h-[92vh] w-full flex-col outline-none ${
          side ? "slide-in h-full max-h-none max-w-md rounded-none sm:rounded-l-2xl" : `pop ${wide ? "max-w-2xl" : "max-w-lg"} rounded-b-none sm:rounded-b-2xl`
        }`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-bold">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="btn btn-ghost !px-2.5 !py-1">
            ✕
          </button>
        </header>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
