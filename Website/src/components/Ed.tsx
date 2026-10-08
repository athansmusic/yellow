import { getDoc } from "@/lib/content";
import type { SiteTextId } from "@/lib/site-text";
import { EditPencil } from "./EditPencil";

/**
 * A piece of static copy the owner can override from /admin/text. Renders the override when one
 * is saved, otherwise the (possibly formatted) default children. Admins also get a tiny pencil.
 */
export async function Ed({ id, children }: { id: SiteTextId; children: React.ReactNode }) {
  const overrides = await getDoc("siteText").catch(() => ({}) as Record<string, string>);
  const o = overrides[id]?.trim();
  return (
    <>
      {o || children}
      <EditPencil id={id} />
    </>
  );
}
