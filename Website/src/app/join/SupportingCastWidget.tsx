"use client";

import Script from "next/script";

/**
 * SupportingCast membership widget, re-skinned from the old Webflow embed.
 * The widget injects its own DOM under #supportingcast-widget; these
 * overrides restyle its class inventory with the site's tokens - dark ink
 * panels and line borders instead of the white cards it ships with.
 * Montserrat is already the site body font, so the widget inherits it.
 */
export function SupportingCastWidget() {
  return (
    <>
      <style
        // Widget classes are stable (.sc-*); everything scoped to the mount.
        dangerouslySetInnerHTML={{
          __html: `
#supportingcast-widget { display: block; font-family: var(--font-body); }
#supportingcast-widget .sc-shop { background: transparent !important; }

/* Plan cards: ink panels, line borders - no white cards, no drop shadows */
#supportingcast-widget .sc-subscription-plan {
  background: var(--color-ink-2) !important;
  border: 1px solid var(--color-line) !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}
#supportingcast-widget .sc-subscription-plan-body h2 {
  color: var(--color-paper) !important;
  font-family: var(--font-display) !important;
  text-transform: uppercase !important;
  letter-spacing: 0.03em !important;
  font-weight: 700 !important;
}
/* Benefits are the selling copy - readable paper, not footnote gray */
#supportingcast-widget .sc-subscription-plan-benefits li {
  color: rgba(242, 240, 234, 0.92) !important;
}
#supportingcast-widget .sc-subscription-plan-benefits-prefix {
  color: rgba(242, 240, 234, 0.78) !important;
}
/* The annual-savings pill shipped near-black-on-ink at 9px - make it the
   yellow callout it is meant to be, at a legible size */
#supportingcast-widget .sc-subscription-price-savings-pill,
#supportingcast-widget .sc-subscription-price-savings-pill * {
  background: var(--color-yellow) !important;
  color: var(--color-ink) !important;
  font-size: 12px !important;
  line-height: 1.3 !important;
}
#supportingcast-widget .sc-subscription-price-savings-pill {
  padding: 3px 8px !important;
  border-radius: 0 !important;
}
#supportingcast-widget .sc-subscription-plan-price,
#supportingcast-widget .sc-subscription-plan-price span {
  color: var(--color-paper) !important;
}
#supportingcast-widget .sc-subscription-plan-pwyw-minimum-price {
  font-size: 1rem !important; font-weight: 600 !important; opacity: 1 !important;
  color: rgba(242, 240, 234, 0.92) !important;
}

/* Best value chip: red on paper, like the site's accent chips */
#supportingcast-widget .sc-subscription-plan-highlight-label {
  background: var(--color-red) !important;
  color: var(--color-paper) !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.14em !important;
}

/* Plan buttons: house button language - ghost until selected, yellow when chosen */
#supportingcast-widget .sc-subscription-plan-button {
  font-family: var(--font-display) !important;
  text-transform: uppercase !important;
  letter-spacing: 0.03em !important;
  border-radius: 0 !important;
  padding: 10px 18px !important;
}
#supportingcast-widget .sc-subscription-plan-button:not(.sc-subscription-plan-button-selected) {
  background: transparent !important;
  color: var(--color-paper) !important;
  border: 2px solid var(--color-paper) !important;
}
#supportingcast-widget .sc-subscription-plan-button:not(.sc-subscription-plan-button-selected):hover {
  border-color: var(--color-yellow) !important;
  color: var(--color-yellow) !important;
}
#supportingcast-widget .sc-subscription-plan-button:not(.sc-subscription-plan-button-selected) .sc-subscription-plan-price,
#supportingcast-widget .sc-subscription-plan-button:not(.sc-subscription-plan-button-selected) .sc-subscription-plan-price span {
  color: inherit !important;
}
#supportingcast-widget .sc-subscription-plan-button-selected {
  background: var(--color-yellow) !important;
  color: var(--color-ink) !important;
  border: 2px solid var(--color-yellow) !important;
}
#supportingcast-widget .sc-subscription-plan-button-selected:hover { background: #fff !important; }
#supportingcast-widget .sc-subscription-plan-button-selected .sc-subscription-plan-price,
#supportingcast-widget .sc-subscription-plan-button-selected .sc-subscription-plan-price span {
  color: var(--color-ink) !important;
}

/* Checkout + promo buttons: primary = yellow on ink, secondary = ghost */
#supportingcast-widget .sc-confirm-order-button {
  background: var(--color-yellow) !important;
  color: var(--color-ink) !important;
  border: none !important;
  border-radius: 0 !important;
  font-family: var(--font-display) !important;
  text-transform: uppercase !important;
  font-size: 1.15rem !important;
  letter-spacing: 0.04em !important;
  padding: 14px 28px !important;
}
#supportingcast-widget .sc-confirm-order-button:hover:not(:disabled) { background: #fff !important; }
#supportingcast-widget .sc-confirm-order-button:disabled { opacity: 0.5 !important; }
#supportingcast-widget .sc-promo-code-redeem-button,
#supportingcast-widget .sc-promo-code-toggle-button,
#supportingcast-widget button.tw-text-gray-800 {
  background: transparent !important;
  color: var(--color-paper) !important;
  border: 2px solid var(--color-paper) !important;
  border-radius: 0 !important;
  font-family: var(--font-display) !important;
  text-transform: uppercase !important;
  padding: 8px 16px !important;
}
#supportingcast-widget .sc-promo-code-redeem-button:hover,
#supportingcast-widget .sc-promo-code-toggle-button:hover,
#supportingcast-widget button.tw-text-gray-800:hover {
  border-color: var(--color-yellow) !important;
  color: var(--color-yellow) !important;
}
#supportingcast-widget .sc-promo-code-cancel-button {
  background: transparent !important;
  color: var(--color-muted) !important;
  border: 1px solid var(--color-line) !important;
  border-radius: 0 !important;
  padding: 6px 12px !important;
}

/* Payment area: ink panel; fields dark with line borders */
#supportingcast-widget .sc-stripe-elements {
  background: var(--color-ink-2) !important;
  border: 1px solid var(--color-line) !important;
  border-radius: 0 !important;
  padding: 24px !important;
  margin-bottom: 16px !important;
}
#supportingcast-widget .p-Input,
#supportingcast-widget input[type="text"],
#supportingcast-widget input[type="email"],
#supportingcast-widget .StripeElement,
#supportingcast-widget .p-CardDetails {
  background: var(--color-ink-3) !important;
  color: var(--color-paper) !important;
  border: 1px solid var(--color-line) !important;
  border-radius: 0 !important;
  padding: 12px !important;
}
#supportingcast-widget input::placeholder { color: var(--color-muted) !important; }
#supportingcast-widget label,
#supportingcast-widget .p-FieldLabel {
  color: var(--color-yellow) !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.14em !important;
  font-size: 0.72rem !important;
  display: block !important;
  margin-bottom: 8px !important;
}

/* Copy + links */
#supportingcast-widget .sc-consent,
#supportingcast-widget .sc-consent span { color: var(--color-muted) !important; font-size: 0.9rem !important; }
#supportingcast-widget a,
#supportingcast-widget .sc-consent a { color: var(--color-yellow) !important; }
`,
        }}
      />
      <div
        id="supportingcast-widget"
        data-initial-view="shop"
        data-menu-visible="false"
        data-publishable-key="wpk_I8kt6WweVJg8cAvL8AtzisBdsdlW9T7eH6zEY38R5ubOaIxrQa6yqYV7BOS24w5sSk5FKSgLbbsDTnq7tmv5lR3vELNcRUlCbvN"
      />
      <Script src="https://hushstudios.supportingcast.fm/js/sc-widget.js" strategy="afterInteractive" />
    </>
  );
}
