"use client";

import { useEffect, useRef } from "react";
import { Close, Play } from "./Icons";

export function TrailerButton({ id, className = "" }: { id: string; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);

  const open = () => {
    const d = ref.current;
    if (!d) return;
    if (frame.current) frame.current.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
    d.showModal();
  };
  const close = () => {
    ref.current?.close();
    if (frame.current) frame.current.src = "";
  };

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const onClose = () => frame.current && (frame.current.src = "");
    d.addEventListener("close", onClose);
    return () => d.removeEventListener("close", onClose);
  }, []);

  return (
    <>
      <button type="button" onClick={open} className={className}>
        <Play width={18} height={18} /> Watch the trailer
      </button>
      <dialog ref={ref} className="backdrop:bg-black/85 bg-transparent p-0 m-auto w-[min(96vw,64rem)] open:flex flex-col" onClick={(e) => e.target === ref.current && close()}>
        <div className="flex justify-end">
          <button type="button" onClick={close} aria-label="Close trailer" className="p-3 text-paper hover:text-yellow">
            <Close width={26} height={26} />
          </button>
        </div>
        <div className="aspect-video bg-black">
          <iframe ref={frame} title="[REDACTED] trailer" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen className="w-full h-full" />
        </div>
      </dialog>
    </>
  );
}
