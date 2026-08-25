"use client";

import { useEffect, useState } from "react";
import { NewsletterForm } from "@/components/NewsletterForm";

const NOISE = "▓▒░#@%&*/\\|<>[]{}";
const rand = (s: string) =>
  s
    .split("")
    .map((ch) => (ch === " " || Math.random() > 0.22 ? ch : NOISE[Math.floor(Math.random() * NOISE.length)]))
    .join("");

/** Turbulence used to chew the edges off the black frames, the way the key art's border is torn. */
export function TearDefs() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute pointer-events-none">
      <filter id="crp-tear" x="-6%" y="-8%" width="112%" height="116%">
        <feTurbulence type="fractalNoise" baseFrequency="0.016 0.05" numOctaves="3" seed="11" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="8" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}

/** A torn black frame drawn behind its content, never around it, so the type stays undistorted. */
export function Torn({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div aria-hidden className="absolute inset-0 border-[3px] border-[#0a0708]" style={{ filter: "url(#crp-tear)" }} />
      <div className="relative">{children}</div>
    </div>
  );
}

/** Micro-type is unreadable as black-on-red at this size, so it gets a black ground to sit on. */
export function Stamp({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-block bg-[#0a0708] text-[#f6ecee] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.28em] ${className}`}>
      {children}
    </span>
  );
}

/** The supplied grain plate, blended over the red ground. Still frame when motion is reduced. */
export function Grain() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <video
        autoPlay
        muted
        loop
        playsInline
        poster="/corrupted/texture-poster.jpg"
        className="sticky top-0 h-screen w-full object-cover opacity-[0.85] mix-blend-multiply motion-reduce:hidden"
      >
        <source src="/corrupted/texture.webm" type="video/webm" />
        <source src="/corrupted/texture.mp4" type="video/mp4" />
      </video>
      <div className="hidden motion-reduce:block sticky top-0 h-screen w-full bg-[url('/corrupted/texture-poster.jpg')] bg-cover bg-center opacity-[0.85] mix-blend-multiply" />
    </div>
  );
}

/** The word CORRUPTED, corrupting: a few letters give way to noise, then recover. */
const WORD = "CORRUPTED";
export function FileStatus() {
  const [text, setText] = useState(WORD);
  useEffect(() => {
    const tick = () => setText(Math.random() < 0.45 ? WORD : rand(WORD));
    tick();
    const t = setInterval(tick, 260);
    return () => clearInterval(t);
  }, []);
  return (
    <Stamp className="!tracking-[.2em]">
      File status{" "}
      <span aria-hidden className="font-mono tracking-normal text-[#e0424f]">
        {text}
      </span>
    </Stamp>
  );
}

/** Confirmed cast, one name at a time. The rest stay off the page until they're announced. */
const NAME = "Xalavier Nelson Jr.";
export function RedactedSlots() {
  const [name, setName] = useState(NAME);
  const [hot, setHot] = useState(false);
  useEffect(() => {
    if (!hot) {
      setName(NAME);
      return;
    }
    const t = setInterval(() => setName(Math.random() < 0.3 ? NAME : rand(NAME)), 90);
    return () => clearInterval(t);
  }, [hot]);

  return (
    <ul className="mt-10 flex flex-wrap gap-6">
      <li className="max-w-[26rem]" onMouseEnter={() => setHot(true)} onMouseLeave={() => setHot(false)}>
        <Stamp>Confirmed</Stamp>
        <p className="mt-4 display text-4xl sm:text-5xl leading-none text-[#0a0708]">{name}</p>
      </li>
    </ul>
  );
}

/** Poster until asked; the embed only loads on click, so no YouTube cookies on arrival. */
export function Trailer() {
  const [playing, setPlaying] = useState(false);
  const id = "E8efpjWoevI";
  return (
    <div className="mt-10">
      <Torn>
        <div className="relative aspect-video bg-[#0a0708] overflow-hidden">
          {playing ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
              title="CORRUPTED trailer"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          ) : (
            <button type="button" onClick={() => setPlaying(true)} className="group absolute inset-0 grid place-items-center" aria-label="Play the CORRUPTED trailer">
              <span aria-hidden className="absolute inset-0 opacity-30 [background-image:repeating-linear-gradient(0deg,rgba(255,255,255,.08)_0px,rgba(255,255,255,.08)_1px,transparent_1px,transparent_3px)]" />
              <span className="relative grid place-items-center size-24 rounded-full bg-[#a21d2d] text-[#0a0708] text-4xl pl-1 group-hover:bg-[#f6ecee] transition-colors">
                ▶
              </span>
            </button>
          )}
        </div>
      </Torn>
      <a href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noreferrer" className="inline-block mt-5">
        <Stamp>Watch on YouTube ↗</Stamp>
      </a>
    </div>
  );
}

/** The show's existing signup, re-pointed at CORRUPTED's palette. Sits on the closing black slab. */
export function CorruptedSignup() {
  return (
    <div className="mt-8 text-left [&_.field]:!bg-[#150b0d] [&_.field]:!border-[#a21d2d] [&_.field]:!text-[#f6ecee] [&_.field:focus]:!border-[#f6ecee] [&_input[type=checkbox]]:accent-[#a21d2d] [&_.text-muted]:!text-[#f6ecee]/65 [&_.btn-yellow]:!bg-[#a21d2d] [&_.btn-yellow]:!text-[#f6ecee] [&_.btn-yellow:hover]:!bg-[#f6ecee] [&_.btn-yellow:hover]:!text-[#0a0708]">
      <NewsletterForm source="corrupted-landing" />
    </div>
  );
}
