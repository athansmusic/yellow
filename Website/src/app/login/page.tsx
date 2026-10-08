import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { ScWidget } from "@/components/ScWidget";

/**
 * Member sign-in. Its own route so the account view has somewhere to send a signed-out visitor
 * instead of dead-ending. Unlisted like /account: noindex, no nav entry, out of the sitemap.
 */
export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <Container className="py-16">
      <h1 className="display text-5xl sm:text-6xl leading-[0.95]">SIGN IN</h1>
      <div className="mt-10">
        <ScWidget view="login" />
      </div>
    </Container>
  );
}
