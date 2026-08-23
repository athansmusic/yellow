import Link from "next/link";
import type { ReactNode } from "react";
import { ICONS, type IconName } from "./Icons";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-7xl px-4 sm:px-6 ${className}`}>{children}</div>;
}

export function Section({ children, className = "", id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`py-14 sm:py-20 ${className}`}>
      <Container>{children}</Container>
    </section>
  );
}

export function Heading({
  eyebrow,
  children,
  as: Tag = "h2",
  size = "lg",
  className = "",
}: {
  eyebrow?: string;
  children: ReactNode;
  as?: "h1" | "h2" | "h3";
  size?: "xl" | "lg" | "md";
  className?: string;
}) {
  const sz = size === "xl" ? "text-6xl sm:text-8xl" : size === "lg" ? "text-4xl sm:text-6xl" : "text-3xl sm:text-4xl";
  return (
    <div className={className}>
      {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
      <Tag className={`display ${sz}`}>{children}</Tag>
    </div>
  );
}

/** Page hero: big title over a brand background, kept short on mobile. */
export function PageHero({ title, eyebrow, intro, bg = "/home/hero.avif", children }: { title: ReactNode; eyebrow?: string; intro?: ReactNode; bg?: string; children?: ReactNode }) {
  return (
    <div className="relative noise overflow-hidden border-b border-line">
      <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: `url(${bg})` }} aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-ink/60 to-ink" aria-hidden />
      <Container className="relative py-14 sm:py-24">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="display text-5xl sm:text-7xl lg:text-8xl">
          [{title}]
        </h1>
        {intro && <div className="mt-5 max-w-2xl text-lg text-paper/90 prose-site">{intro}</div>}
        {children}
      </Container>
    </div>
  );
}

export function LinkIcons({ links, size = 18, className = "" }: { links: Partial<Record<IconName, string>>; size?: number; className?: string }) {
  const entries = Object.entries(links).filter(([, v]) => !!v) as [IconName, string][];
  if (!entries.length) return null;
  return (
    <div className={`flex flex-wrap gap-0.5 -ml-2 ${className}`}>
      {entries.map(([k, href]) => {
        const I = ICONS[k];
        return (
          <a key={k} href={href} target="_blank" rel="noreferrer" aria-label={k === "web" ? "Website" : k} className="p-2 text-muted hover:text-yellow">
            <I width={size} height={size} />
          </a>
        );
      })}
    </div>
  );
}

export function PlatformButtons({ links, label = "Listen on", size = "md" }: { links: readonly { name: string; href: string; icon: IconName }[]; label?: string; size?: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? 56 : size === "sm" ? 36 : 44;
  const ic = size === "lg" ? 26 : size === "sm" ? 16 : 20;
  return (
    <ul className="flex flex-wrap gap-3" aria-label={label}>
      {links.map((l) => {
        const I = ICONS[l.icon];
        return (
          <li key={l.name}>
            <a
              href={l.href}
              target="_blank"
              rel="noreferrer"
              aria-label={`${label} ${l.name}`}
              title={l.name}
              className="grid place-items-center rounded-full bg-paper text-ink hover:bg-yellow transition-colors"
              style={{ width: dim, height: dim }}
            >
              <I width={ic} height={ic} />
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export function Crumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted">
      <ol className="flex flex-wrap gap-2">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2">
            {it.href ? (
              <Link href={it.href} className="hover:text-yellow">
                {it.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-paper">
                {it.label}
              </span>
            )}
            {i < items.length - 1 && <span aria-hidden>/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
