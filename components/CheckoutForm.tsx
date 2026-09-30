"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, FlaskConical, Loader2, ShoppingBag } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { RESTAURANT } from "@/data/restaurant";
import { track, type PaymentMethod } from "@/lib/analytics";
import { simulatePayment, type SimulatedOutcome } from "@/lib/mockPayment";
import { useHydrated } from "@/lib/useHydrated";
import { computeTotals, formatPrice, generateOrderId } from "@/lib/utils";
import { validateAddress, validateName, validatePhone } from "@/lib/validation";
import { cartCount, cartSubtotal, resolveLines, useCart } from "@/store/cart";
import { useOrders, type DeliveryDetails } from "@/store/orders";
import { OrderSummary } from "./OrderSummary";
import {
  INITIAL_PAYMENT,
  PaymentSelector,
  validatePayment,
  type PaymentErrors,
  type PaymentState,
} from "./PaymentSelector";

type DeliveryField = keyof DeliveryDetails;

const SHOW_SIMULATOR = process.env.NEXT_PUBLIC_SHOW_PAYMENT_SIMULATOR !== "false";

const deliveryValidators: Record<DeliveryField, (v: string) => string | null> = {
  name: validateName,
  phone: validatePhone,
  address: validateAddress,
};

function validateDelivery(d: DeliveryDetails) {
  const errors: Partial<Record<DeliveryField, string>> = {};
  (Object.keys(deliveryValidators) as DeliveryField[]).forEach((k) => {
    const e = deliveryValidators[k](d[k]);
    if (e) errors[k] = e;
  });
  return errors;
}

export function CheckoutForm() {
  const router = useRouter();
  const hydrated = useHydrated();
  const lines = useCart((s) => s.lines);
  const clearCart = useCart((s) => s.clear);
  const saveOrder = useOrders((s) => s.saveOrder);

  const [delivery, setDelivery] = useState<DeliveryDetails>({ name: "", phone: "", address: "" });
  const [payment, setPayment] = useState<PaymentState>(INITIAL_PAYMENT);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [outcome, setOutcome] = useState<SimulatedOutcome>("random");
  const startedRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const resolved = resolveLines(lines);
  const { subtotal, tax, total } = computeTotals(cartSubtotal(lines));

  const deliveryErrors = validateDelivery(delivery);
  const paymentErrors = validatePayment(payment);
  const show = (field: string) => submitted || touched[field];

  useEffect(() => {
    if (!hydrated || startedRef.current) return;
    const state = useCart.getState();
    if (state.lines.length === 0) return;
    startedRef.current = true;
    track("checkout_started", {
      cartValue: cartSubtotal(state.lines),
      itemCount: cartCount(state.lines),
    });
  }, [hydrated]);

  const onMethodChange = (method: PaymentMethod) => {
    if (method === payment.method) return;
    setPayment((p) => ({ ...p, method }));
    track("payment_method_selected", { paymentMethod: method });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(deliveryErrors).length || Object.keys(paymentErrors).length) {
      // Move focus to the first invalid field.
      window.setTimeout(() => {
        formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      }, 0);
      return;
    }

    setPlacing(true);
    const orderId = generateOrderId();
    const items = resolved.map((l) => ({
      itemId: l.item.id,
      name: l.item.name,
      qty: l.qty,
      price: l.item.price,
    }));

    const { succeeded, reason } = await simulatePayment(
      outcome,
      payment.method === "upi" ? 1800 : 1400,
    );

    saveOrder({
      id: orderId,
      items,
      subtotal,
      tax,
      total,
      paymentMethod: payment.method,
      delivery: {
        name: delivery.name.trim(),
        phone: delivery.phone.trim(),
        address: delivery.address.trim(),
      },
      status: succeeded ? "confirmed" : "failed",
      createdAt: new Date().toISOString(),
      estimatedMinutes: 35,
      failureReason: reason,
    });

    if (succeeded) {
      track("order_placed", {
        orderId,
        items,
        subtotal,
        tax,
        total,
        paymentMethod: payment.method,
      });
      clearCart();
    } else {
      track("order_failed", {
        orderId,
        reason: reason ?? "unknown",
        total,
        paymentMethod: payment.method,
      });
    }
    router.push(`/order/${orderId}`);
  };

  if (!hydrated) {
    return (
      <div className="container-page py-14" aria-busy="true">
        <div className="bg-sand h-10 w-48 animate-pulse rounded-lg" />
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="card bg-sand/60 h-96 animate-pulse lg:col-span-2" />
          <div className="card bg-sand/60 h-72 animate-pulse" />
        </div>
      </div>
    );
  }

  if (resolved.length === 0 && !placing) {
    return (
      <div className="container-page py-14">
        <div className="card mx-auto flex max-w-lg flex-col items-center gap-4 px-8 py-14 text-center">
          <span className="bg-terracotta-50 text-terracotta-600 flex size-16 items-center justify-center rounded-full">
            <ShoppingBag className="size-7" aria-hidden />
          </span>
          <h1 className="text-2xl font-semibold">Nothing to check out yet</h1>
          <p className="text-muted">Add a few dishes to your cart first.</p>
          <Link href="/menu" className="btn-primary">
            Browse the menu
          </Link>
        </div>
      </div>
    );
  }

  const deliveryInput = (field: DeliveryField) => ({
    id: `delivery-${field}`,
    value: delivery[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDelivery((d) => ({ ...d, [field]: e.target.value })),
    onBlur: () => setTouched((t) => ({ ...t, [field]: true })),
    "aria-invalid": show(field) && deliveryErrors[field] ? true : undefined,
    "aria-describedby":
      show(field) && deliveryErrors[field] ? `delivery-${field}-error` : undefined,
    className: "input",
  });

  const visiblePaymentErrors: PaymentErrors = Object.fromEntries(
    Object.entries(paymentErrors).filter(([k]) => show(k)),
  );

  return (
    <div className="container-page py-10 sm:py-14">
      <Link href="/cart" className="btn-ghost mb-4 -ml-3 min-h-10 px-3">
        <ArrowLeft className="size-4" aria-hidden /> Back to cart
      </Link>
      <h1 className="text-4xl font-semibold sm:text-5xl">Checkout</h1>

      <form
        ref={formRef}
        onSubmit={onSubmit}
        noValidate
        className="mt-8 grid gap-8 lg:grid-cols-3"
        aria-describedby="checkout-help"
      >
        <p id="checkout-help" className="sr-only">
          All fields are required.
        </p>
        <div className="space-y-8 lg:col-span-2">
          <section aria-labelledby="delivery-heading" className="card p-6 sm:p-8">
            <h2 id="delivery-heading" className="text-2xl font-semibold">
              Delivery details
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="delivery-name" className="label">
                  Full name
                </label>
                <input {...deliveryInput("name")} autoComplete="name" placeholder="Priya Sharma" />
                {show("name") && deliveryErrors.name && (
                  <p id="delivery-name-error" className="field-error">
                    {deliveryErrors.name}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="delivery-phone" className="label">
                  Phone number
                </label>
                <input
                  {...deliveryInput("phone")}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="98765 43210"
                />
                {show("phone") && deliveryErrors.phone && (
                  <p id="delivery-phone-error" className="field-error">
                    {deliveryErrors.phone}
                  </p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="delivery-address" className="label">
                  Delivery address
                </label>
                <textarea
                  {...deliveryInput("address")}
                  className="input min-h-24 resize-y"
                  autoComplete="street-address"
                  placeholder="Flat / house no., street, area, city, PIN"
                  rows={3}
                />
                {show("address") && deliveryErrors.address && (
                  <p id="delivery-address-error" className="field-error">
                    {deliveryErrors.address}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section aria-labelledby="payment-heading" className="card p-6 sm:p-8">
            <h2 id="payment-heading" className="text-2xl font-semibold">
              Payment
            </h2>
            <div className="mt-6">
              <PaymentSelector
                value={payment}
                errors={visiblePaymentErrors}
                onChange={(patch) => setPayment((p) => ({ ...p, ...patch }))}
                onMethodChange={onMethodChange}
                onBlurField={(f) => setTouched((t) => ({ ...t, [f]: true }))}
              />
            </div>
          </section>

          {SHOW_SIMULATOR && (
            <section
              aria-labelledby="simulator-heading"
              className="rounded-2xl border border-dashed border-olive-500 bg-olive-50/60 p-5"
            >
              <h2
                id="simulator-heading"
                className="flex items-center gap-2 font-sans text-sm font-semibold text-olive-700"
              >
                <FlaskConical className="size-4" aria-hidden /> Demo: payment outcome
              </h2>
              <p className="text-muted mt-1 text-sm">
                There&apos;s no real payment gateway. Choose how the mock payment should resolve.
              </p>
              <div
                className="mt-3 flex flex-wrap gap-2"
                role="radiogroup"
                aria-labelledby="simulator-heading"
              >
                {(
                  [
                    ["random", "Random (85% success)"],
                    ["success", "Always succeed"],
                    ["failure", "Always fail"],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className="border-line flex cursor-pointer items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-sm has-[:checked]:border-olive-700 has-[:checked]:text-olive-700 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-olive-700"
                  >
                    <input
                      type="radio"
                      name="simulated-outcome"
                      value={value}
                      checked={outcome === value}
                      onChange={() => setOutcome(value)}
                      className="size-3.5 accent-olive-700"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <OrderSummary
            lines={resolved.map((l) => ({
              id: l.item.id,
              name: l.item.name,
              qty: l.qty,
              lineTotal: l.lineTotal,
            }))}
            subtotal={subtotal}
            tax={tax}
            total={total}
          >
            <button type="submit" className="btn-primary h-12 w-full text-base" disabled={placing}>
              {placing ? (
                <>
                  <Loader2 className="size-5 animate-spin" aria-hidden /> Processing…
                </>
              ) : (
                <>Place order · {formatPrice(total)}</>
              )}
            </button>
            <p className="text-muted mt-3 text-center text-xs">
              Estimated delivery {RESTAURANT.deliveryEta}
            </p>
          </OrderSummary>
        </div>
      </form>

      <AnimatePresence>
        {placing && (
          <motion.div
            className="bg-cream/80 fixed inset-0 z-50 flex items-center justify-center px-6 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="status"
            aria-live="assertive"
          >
            <div className="card flex max-w-sm flex-col items-center gap-4 px-8 py-10 text-center">
              <Loader2 className="text-terracotta-600 size-10 animate-spin" aria-hidden />
              <p className="font-display text-xl">
                {payment.method === "upi"
                  ? payment.upiMode === "app"
                    ? `Waiting for approval in ${payment.upiApp}…`
                    : "Waiting for UPI approval…"
                  : "Confirming your payment…"}
              </p>
              <p className="text-muted text-sm">Please don&apos;t close this page.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
