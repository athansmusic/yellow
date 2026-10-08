# Roadmap

What is left, and what the hard part is, so picking something up does not begin by re-deciding it.

Updated 2026-08-31.

---

## Done since this was written

Updates, Albums and the member store discount are all built and live, along with comments
(members-only, with replies, spoilers, reactions, editing, avatars and moderation), the reply bell,
and a blocked-word list. The notes below are what remains.

---

## Waiting on you, not on code

- **Run `supabase/add_comment_blocklist.sql`** if it has not been run — it is the newest migration
  and the blocked-word list does nothing without it.
- **`CREATOR_SC_USER_IDS`** in Curtain's environment, so your own comments carry the creator badge.
  Post once, read `sc_user_id` from Supabase, set it. Keyed by id and never by display name,
  because a name is something any member can type.
- **Post one comment.** Every refusal path is verified — bad token, no token, bad slug, blocked
  word — but no comment has ever been successfully stored, so the write path is still theoretical.
- **Seed the discussion before switching it on everywhere.** Fifty-three empty threads read as
  abandoned. Recent episodes first, each with a note from you.

## Worth doing next

- **Comments live on episodes and Updates only.** Aberrations pages are the obvious third home — a
  monster catalogue invites comment far more than a cast page does. CORRUPTED at launch.
- **What's on Mars sizing is fixed, but nothing else was touched.** Hoodies and jackets still carry
  their original spreads ($4–$8). The tee ladder is the only one flattened; the same reasoning
  would apply to the rest if you want it.
- **`SHOW_SIGNED_OUT_PITCH`** in `Comments.tsx` is false until membership moves off Patreon. One
  line, and the copy is already written.

## Known limitations, deliberate

- **Album zips are uploaded, not assembled.** Building one server-side means holding the whole
  album in memory in a serverless function, which is a wall this codebase has already hit.
- **New-post counts are per browser.** They are compared against a marker in localStorage rather
  than a row per member per post — no fan-out to write, nothing to keep in step.
- **Spoiler blur is a courtesy, not a boundary.** Every reader is already a member; the text is in
  the page either way.
