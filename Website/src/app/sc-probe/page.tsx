import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { Probe } from "./Probe";

/** Temporary diagnostic page. Delete once the episode-uuid mapping is settled. */
export const metadata: Metadata = {
  title: "SC probe",
  robots: { index: false, follow: false },
};

export default function ScProbePage() {
  return (
    <Container className="py-16">
      <h1 className="display text-3xl">SC PROBE</h1>
      <Probe />
    </Container>
  );
}
