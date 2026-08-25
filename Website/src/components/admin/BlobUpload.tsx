"use client";

import { upload } from "@vercel/blob/client";
import { useState } from "react";

/**
 * Uploads the chosen file straight to Blob from the browser, then hands the resulting URL to a
 * server action. Keeps big files out of the serverless request body, which caps around 4.5 MB.
 */
export function BlobUpload({
  slug,
  kind,
  action,
  withTitle = false,
  label = "Upload",
}: {
  slug: string;
  kind: "art" | "photo";
  action: (fd: FormData) => Promise<void>;
  withTitle?: boolean;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File) || file.size === 0) return setError("Choose a file first.");
    setBusy(true);
    setError("");
    try {
      const blob = await upload(`contributors/${slug}/${kind}-${Date.now()}-${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/blob-upload",
      });
      const out = new FormData();
      out.set("slug", slug);
      out.set("url", blob.url);
      out.set("title", String(data.get("title") ?? ""));
      await action(out);
      form.reset();
    } catch (err) {
      setError((err as Error).message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-2">
      <input type="file" name="file" required accept="image/png,image/jpeg,image/webp,image/avif,image/gif" className="field !py-2 file:mr-3 file:border-0 file:bg-yellow file:text-ink file:px-3 file:py-1 file:font-semibold" />
      {withTitle && <input type="text" name="title" placeholder="Title (optional)" className="field" />}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className="btn btn-yellow disabled:opacity-60">
          {busy ? "Uploading…" : label}
        </button>
        {error && <span className="text-sm text-red">{error}</span>}
      </div>
    </form>
  );
}
