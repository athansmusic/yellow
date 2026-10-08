import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { login } from "../actions";

export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next = "/admin", error } = await searchParams;
  const session = await auth();
  if (session?.user) redirect(next);
  const configured = !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_SECRET;

  return (
    <div className="max-w-md">
      <p className="eyebrow">Staff</p>
      <h1 className="display text-5xl mt-2">Sign in</h1>
      <p className="mt-4 text-paper/85">Staff accounts only.</p>
      {error && (
        <p role="alert" className="mt-4 border border-red bg-red/10 p-3 text-sm">
          {error === "AccessDenied" ? "That account doesn't have access." : "Sign-in didn't go through. Try again."}
        </p>
      )}
      {configured ? (
        <form action={login} className="mt-6">
          <input type="hidden" name="next" value={next} />
          <button type="submit" className="btn btn-yellow">
            Continue with Google
          </button>
        </form>
      ) : (
        <p className="mt-6 border border-line bg-ink-2 p-4 text-sm text-muted">Sign-in isn&apos;t configured yet: AUTH_SECRET, AUTH_GOOGLE_ID, and AUTH_GOOGLE_SECRET need to be set.</p>
      )}
    </div>
  );
}
