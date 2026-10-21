"use client";

import { useEffect, useState } from "react";

// One session check per page load, shared by every pencil
let adminCheck: Promise<boolean> | null = null;
const isAdmin = () =>
  (adminCheck ??= fetch("/api/auth/session")
    .then((r) => (r.ok ? r.json() : null))
    .then((s: { user?: unknown } | null) => !!s?.user)
    .catch(() => false));

/** Invisible to visitors; signed-in admins get a small pencil linking to the text editor. */
export function EditPencil({ id }: { id: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let dead = false;
    isAdmin().then((v) => !dead && setShow(v));
    return () => {
      dead = true;
    };
  }, []);
  if (!show) return null;
  return (
    <a href={`/admin/text#${id}`} aria-label="Edit this text" title="Edit this text (admin)" className="ml-1.5 inline-block align-middle text-muted hover:text-yellow text-xs no-underline">
      ✎
    </a>
  );
}
