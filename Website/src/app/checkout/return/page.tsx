import type { Metadata } from "next";
import Link from "next/link";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { Container } from "@/components/ui";
import { ClearCart } from "@/components/ClearCart";

export const metadata: Metadata = { title: "Order complete", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ReturnPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  if (!session_id || !stripeEnabled()) {
    return (
      <Container className="py-16 max-w-2xl">
        <h1 className="display text-5xl">Hmm.</h1>
        <p className="mt-3 text-muted">We couldn't find that checkout session.</p>
        <Link href="/store" className="btn btn-yellow mt-6">
          Back to the store
        </Link>
      </Container>
    );
  }
  const session = await stripe().checkout.sessions.retrieve(session_id);
  const paid = session.status === "complete";
  const email = session.customer_details?.email;
  const name = session.customer_details?.name?.split(" ")[0];

  return (
    <Container className="py-16 max-w-2xl">
      {paid ? (
        <>
          <ClearCart />
          <p className="eyebrow text-yellow">Order confirmed</p>
          <h1 className="display text-5xl sm:text-7xl mt-2">Thanks{name ? `, ${name}` : ""}.</h1>
          <p className="mt-4 text-paper/85">
            Your order is in. A receipt is on its way to <strong>{email}</strong>. Everything is printed to order, so it ships in 3 to 7 business days, and you'll get a tracking email the moment it does.
          </p>
          <p className="mt-2 text-sm text-muted tabular">Order reference: {session_id.slice(-12).toUpperCase()}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/episodes" className="btn btn-yellow">
              Listen while you wait
            </Link>
            <Link href="/store" className="btn btn-ghost">
              Keep shopping
            </Link>
          </div>
        </>
      ) : (
        <>
          <h1 className="display text-5xl">Payment not completed</h1>
          <p className="mt-3 text-muted">No charge was made. Your cart is still here if you want to try again.</p>
          <Link href="/cart" className="btn btn-yellow mt-6">
            Back to cart
          </Link>
        </>
      )}
    </Container>
  );
}
