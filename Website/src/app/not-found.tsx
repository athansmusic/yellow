import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { NotFoundClient } from "@/components/NotFoundClient";

export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: true } };

export default function NotFound() {
  return (
    <Container className="py-16 sm:py-24 text-center max-w-3xl">
      <p className="eyebrow">404</p>
      <h1 className="display text-6xl sm:text-8xl mt-2">REDACTED</h1>
      <NotFoundClient />
    </Container>
  );
}
