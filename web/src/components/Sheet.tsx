import { useEffect, useState } from "react";
import { XIcon } from "./icons";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

export default function Sheet({ open, onClose, title, children }: SheetProps) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [kbOffset, setKbOffset] = useState(0);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), 200);
    return () => clearTimeout(t);
  }, [open]);

  // Lock body scroll while open
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mounted]);

  // Escape key
  useEffect(() => {
    if (!mounted) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mounted, onClose]);

  // Lift sheet above keyboard on iOS (visualViewport shrinks when keyboard opens)
  useEffect(() => {
    if (!mounted) return;
    const vv = window.visualViewport;
    if (!vv) return;
    function update() {
      const offset = window.innerHeight - vv!.offsetTop - vv!.height;
      setKbOffset(Math.max(0, offset));
    }
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      setKbOffset(0);
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={`absolute inset-0 bg-black/70 transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ bottom: kbOffset }}
        className={`absolute inset-x-0 mx-auto max-w-2xl bg-neutral-900 rounded-t-3xl border-t border-neutral-800 shadow-2xl transform transition-[transform,bottom] duration-200 ease-out max-h-[92dvh] flex flex-col ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex flex-col items-center pt-2 pb-1 shrink-0">
          <span className="w-9 h-1 rounded-full bg-neutral-700" />
        </div>
        <div className="flex items-center justify-between px-5 pb-3 border-b border-neutral-800 shrink-0">
          <h3 className="text-base font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 -mr-2 flex items-center justify-center rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 active:bg-neutral-700"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
          {children}
        </div>
      </div>
    </div>
  );
}
