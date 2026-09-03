"use client";

import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Uploads the chosen files straight to Blob from the browser, then hands the URLs to a server
 * action. Keeps big files out of the serverless request body, which caps around 4.5 MB.
 */
export function BlobUpload({
  slug,
  kind,
  action,
  withTitle = false,
  multiple = false,
  label = "Upload",
}: {
  slug: string;
  kind: "art" | "photo";
  action: (fd: FormData) => Promise<void>;
  withTitle?: boolean;
  multiple?: boolean;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const files = data.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
    if (!files.length) return setError("Choose a file first.");
    setError("");
    const urls: string[] = [];
    try {
      for (const [i, file] of files.entries()) {
        setBusy(files.length > 1 ? `Uploading ${i + 1} of ${files.length}…` : "Uploading…");
        const blob = await upload(`contributors/${slug}/${kind}-${Date.now()}-${file.name}`, file, {
          access: "public",
          handleUploadUrl: "/api/blob-upload",
        });
        urls.push(blob.url);
      }
      setBusy("Saving…");
      const out = new FormData();
      out.set("slug", slug);
      for (const u of urls) out.append("url", u);
      // A single title only makes sense for a single file
      out.set("title", files.length === 1 ? String(data.get("title") ?? "") : "");
      await action(out);
      form.reset();
      router.refresh();
    } catch (err) {
      setError((err as Error).message || "Upload failed.");
    } finally {
      setBusy("");
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-2">
      <input
        type="file"
        name="file"
        required
        multiple={multiple}
        accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
        className="field !py-2 file:mr-3 file:border-0 file:bg-yellow file:text-ink file:px-3 file:py-1 file:font-semibold"
      />
      {withTitle && <input type="text" name="title" placeholder="Title (optional, single file only)" className="field" />}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={!!busy} className="btn btn-yellow disabled:opacity-60">
          {busy || label}
        </button>
        {error && <span className="text-sm text-red">{error}</span>}
      </div>
    </form>
  );
}
