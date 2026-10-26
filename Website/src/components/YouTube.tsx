"use client";

import Image from "next/image";
import { useState } from "react";
import { Play } from "./Icons";

/** Click-to-load YouTube embed: no third-party JS until the viewer asks for it. */
export function YouTube({ id, title }: { id: string; title: string }) {
  const [on, setOn] = useState(false);
  return (
    <div className="relative aspect-video bg-ink-2 border border-line overflow-hidden">
      {on ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      ) : (
        <button type="button" onClick={() => setOn(true)} aria-label={`Play video: ${title}`} className="group absolute inset-0 w-full h-full">
          <Image src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
          <span className="absolute inset-0 grid place-items-center">
            <span className="size-16 rounded-full bg-yellow text-ink grid place-items-center group-hover:scale-105 transition-transform">
              <Play width={28} height={28} />
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
