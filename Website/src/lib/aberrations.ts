/** Client-safe helpers for the Unit's designation scheme (no server imports). */

/** Designation letters after "AT" (Aberrant Threat). Order matters for display. */
export const ABERRATION_CLASSES: Record<string, string> = { P: "Physical", S: "Spatial", C: "Cognitive", Q: "Quantum", T: "Temporal" };

/** "ATPSC-0034" -> ["P","S","C"]; "Pending" / "Unknown…" -> [] */
export function designationClasses(designation?: string): string[] {
  const m = (designation ?? "").toUpperCase().match(/^AT([PSCQT]+)-?/);
  return m ? m[1].split("") : [];
}

