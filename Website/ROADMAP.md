# Roadmap

Wanted next, not started. Each entry says what it is and what the hard part is, so picking one up
does not begin with re-deciding it.

Recorded 2026-08-29.

---

## Updates — a members' thread, posted from Curtain

Blog-style posts, written and published in Curtain the way episode copy already is, appearing on
the show site. Tagged. **Hidden unless signed in**, and members can comment on them.

Posts need attachments: images, video, audio.

**What already exists to build on**

- Comments are done and members-only, keyed on an arbitrary slug (`episode_comments.episode_slug`
  is deliberately not a foreign key), so an update post can carry a thread with no schema change.
- Curtain already publishes copy to the site through `/api/public/episode-meta`; an
  `/api/public/updates` alongside it is the same shape.
- The site's members-only pattern is settled: fetch with the Supporting Cast token, and Curtain
  verifies it. Reuse `whoIsMember`.

**The hard part is the files, not the posts.** The site has no database and only Vercel Blob, whose
overwrites serve stale through the CDN for weeks — fine for write-once uploads, wrong for anything
edited. Curtain has Supabase Storage and already uploads audio for Petra. Decide which store owns
update attachments before writing any of it, and note that member-only files need signed URLs
rather than public ones, or the gate is decorative.

---

## Albums — full downloads for members

A section where whole albums are uploaded, and signed-in members can download either the complete
album or individual tracks.

**The hard part is delivery, not listing.** A download link a member can copy is a download link
anyone can use, so:

- Files must not sit at guessable public URLs. Signed, short-lived URLs minted per request after
  the token check, the same way `/api/early` gates a synopsis today.
- "Download the whole album" means either zipping on demand (slow, memory-hungry on a serverless
  function, and the reason most sites do not) or storing a prebuilt zip per album at upload time.
  The second is almost certainly right.
- Large files through a serverless proxy hit execution limits. Curtain already learned this the
  hard way — see `fix(share): episode audio via signed-URL redirect (storage mirror) — Vercel kills
  long Drive proxies`. Redirect to storage; never stream through the app.

---

## Automatic store discount for members

A signed-in member gets a discount applied across the store without typing a code.

**Open questions before this is buildable**

- The store runs on Printful. Whether a discount can be applied programmatically, and at what layer
  (cart, checkout, a generated single-use code), needs checking against whatever handles checkout —
  a per-member code minted on demand is the usual answer.
- A code that auto-applies for members is a code that leaks. Single-use per member, or tied to
  their Supporting Cast id, or both.
- Decide what happens to a member's discount when their membership lapses mid-order.

---

## Also noted, smaller

- **Seed the discussion before switching it on everywhere.** 53 empty threads read as abandoned.
  Recent episodes first, each with a note from you.
- **`CREATOR_SC_USER_IDS`** is unset in Curtain, so no comment is badged as the creator yet. Post
  once, read `sc_user_id` from Supabase, set the env var.
- **Comments live on episodes only.** Aberrations pages are the obvious second home; CORRUPTED at
  launch.
