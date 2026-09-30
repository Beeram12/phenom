"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CreditCard, Lock, Smartphone } from "lucide-react";
import { useId, type KeyboardEvent } from "react";
import type { PaymentMethod } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import {
  detectCardBrand,
  formatCardNumber,
  formatExpiry,
  validateCardName,
  validateCardNumber,
  validateCvv,
  validateExpiry,
  validateUpiId,
} from "@/lib/validation";

export type UpiMode = "id" | "app";
export const UPI_APPS = ["Google Pay", "PhonePe", "Paytm", "BHIM"] as const;
export type UpiApp = (typeof UPI_APPS)[number];

export interface PaymentState {
  method: PaymentMethod;
  upiMode: UpiMode;
  upiId: string;
  upiApp: UpiApp;
  cardNumber: string;
  expiry: string;
  cvv: string;
  cardName: string;
}

export type PaymentErrors = Partial<
  Record<"upiId" | "cardNumber" | "expiry" | "cvv" | "cardName", string>
>;

export const INITIAL_PAYMENT: PaymentState = {
  method: "upi",
  upiMode: "id",
  upiId: "",
  upiApp: "Google Pay",
  cardNumber: "",
  expiry: "",
  cvv: "",
  cardName: "",
};

export function validatePayment(p: PaymentState): PaymentErrors {
  const errors: PaymentErrors = {};
  if (p.method === "upi") {
    if (p.upiMode === "id") {
      const e = validateUpiId(p.upiId);
      if (e) errors.upiId = e;
    }
  } else {
    const brand = detectCardBrand(p.cardNumber.replace(/\D/g, ""));
    const checks = {
      cardNumber: validateCardNumber(p.cardNumber),
      expiry: validateExpiry(p.expiry),
      cvv: validateCvv(p.cvv, brand),
      cardName: validateCardName(p.cardName),
    };
    for (const [k, v] of Object.entries(checks)) if (v) errors[k as keyof PaymentErrors] = v;
  }
  return errors;
}

interface PaymentSelectorProps {
  value: PaymentState;
  errors: PaymentErrors;
  onChange: (patch: Partial<PaymentState>) => void;
  onMethodChange: (method: PaymentMethod) => void;
  onBlurField: (field: keyof PaymentErrors) => void;
}

const METHODS: { id: PaymentMethod; label: string; hint: string; Icon: typeof Smartphone }[] = [
  { id: "upi", label: "UPI", hint: "Google Pay, PhonePe, Paytm & more", Icon: Smartphone },
  { id: "card", label: "Card", hint: "Credit or debit card", Icon: CreditCard },
];

export function PaymentSelector({
  value,
  errors,
  onChange,
  onMethodChange,
  onBlurField,
}: PaymentSelectorProps) {
  const uid = useId();
  const brand = detectCardBrand(value.cardNumber.replace(/\D/g, ""));

  const onRadioKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)) {
      e.preventDefault();
      const next = value.method === "upi" ? "card" : "upi";
      onMethodChange(next);
      document.getElementById(`${uid}-method-${next}`)?.focus();
    }
  };

  const fieldProps = (name: keyof PaymentErrors) => ({
    id: `${uid}-${name}`,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${uid}-${name}-error` : undefined,
    onBlur: () => onBlurField(name),
  });

  const errorText = (name: keyof PaymentErrors) =>
    errors[name] ? (
      <p id={`${uid}-${name}-error`} className="field-error">
        {errors[name]}
      </p>
    ) : null;

  return (
    <div>
      <div role="radiogroup" aria-label="Payment method" className="grid gap-3 sm:grid-cols-2">
        {METHODS.map(({ id, label, hint, Icon }) => {
          const selected = value.method === id;
          return (
            <button
              key={id}
              id={`${uid}-method-${id}`}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onMethodChange(id)}
              onKeyDown={onRadioKey}
              className={cn(
                "flex items-center gap-4 rounded-2xl border bg-white p-4 text-left transition",
                selected
                  ? "border-terracotta-600 ring-terracotta-100 ring-2"
                  : "border-line hover:border-terracotta-500",
              )}
            >
              <span
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-xl",
                  selected ? "bg-terracotta-600 text-white" : "bg-sand text-ink",
                )}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{label}</span>
                <span className="text-muted block text-sm">{hint}</span>
              </span>
              <span
                aria-hidden
                className={cn(
                  "ml-auto flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                  selected ? "border-terracotta-600" : "border-line",
                )}
              >
                {selected && <span className="bg-terracotta-600 size-2.5 rounded-full" />}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={value.method}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="mt-6"
        >
          {value.method === "upi" ? (
            <fieldset className="space-y-4">
              <legend className="sr-only">UPI details</legend>
              <div className="flex flex-col gap-2 sm:flex-row">
                {(
                  [
                    ["id", "Enter UPI ID"],
                    ["app", "Pay via UPI app"],
                  ] as const
                ).map(([mode, text]) => (
                  <label
                    key={mode}
                    className={cn(
                      "has-[:focus-visible]:ring-terracotta-600 flex flex-1 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition has-[:focus-visible]:ring-2",
                      value.upiMode === mode
                        ? "border-terracotta-600 bg-terracotta-50"
                        : "border-line hover:border-terracotta-500 bg-white",
                    )}
                  >
                    <input
                      type="radio"
                      name={`${uid}-upi-mode`}
                      value={mode}
                      checked={value.upiMode === mode}
                      onChange={() => onChange({ upiMode: mode })}
                      className="accent-terracotta-600 size-4"
                    />
                    {text}
                  </label>
                ))}
              </div>

              {value.upiMode === "id" ? (
                <div>
                  <label htmlFor={`${uid}-upiId`} className="label">
                    UPI ID
                  </label>
                  <input
                    {...fieldProps("upiId")}
                    className="input"
                    inputMode="email"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="yourname@okbank"
                    value={value.upiId}
                    onChange={(e) => onChange({ upiId: e.target.value.trim() })}
                  />
                  {errorText("upiId") ?? (
                    <p className="text-muted mt-1.5 text-sm">
                      You&apos;ll get a payment request in your UPI app.
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <p id={`${uid}-app-label`} className="label">
                    Choose your app
                  </p>
                  <div
                    role="radiogroup"
                    aria-labelledby={`${uid}-app-label`}
                    className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                  >
                    {UPI_APPS.map((app) => (
                      <label
                        key={app}
                        className={cn(
                          "has-[:focus-visible]:ring-terracotta-600 flex cursor-pointer items-center justify-center rounded-xl border px-3 py-3 text-center text-sm font-medium transition has-[:focus-visible]:ring-2",
                          value.upiApp === app
                            ? "border-terracotta-600 bg-terracotta-50 text-terracotta-700"
                            : "border-line hover:border-terracotta-500 bg-white",
                        )}
                      >
                        <input
                          type="radio"
                          name={`${uid}-upi-app`}
                          value={app}
                          checked={value.upiApp === app}
                          onChange={() => onChange({ upiApp: app })}
                          className="sr-only"
                        />
                        {app}
                      </label>
                    ))}
                  </div>
                  <p className="text-muted mt-2 text-sm">
                    We&apos;ll open {value.upiApp} to approve the payment when you place the order.
                  </p>
                </div>
              )}
            </fieldset>
          ) : (
            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="sr-only">Card details</legend>
              <div className="sm:col-span-2">
                <label htmlFor={`${uid}-cardNumber`} className="label">
                  Card number
                </label>
                <div className="relative">
                  <input
                    {...fieldProps("cardNumber")}
                    className="input pr-24 tabular-nums"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder="1234 5678 9012 3456"
                    value={value.cardNumber}
                    onChange={(e) => onChange({ cardNumber: formatCardNumber(e.target.value) })}
                  />
                  {brand && (
                    <span className="bg-sand text-ink absolute top-1/2 right-3 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold">
                      {brand}
                    </span>
                  )}
                </div>
                {errorText("cardNumber")}
              </div>
              <div>
                <label htmlFor={`${uid}-expiry`} className="label">
                  Expiry (MM/YY)
                </label>
                <input
                  {...fieldProps("expiry")}
                  className="input tabular-nums"
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  placeholder="MM/YY"
                  value={value.expiry}
                  onChange={(e) => {
                    const raw = e.target.value;
                    // Let backspace remove the slash naturally.
                    const next = raw.length < value.expiry.length ? raw : formatExpiry(raw);
                    onChange({ expiry: next });
                  }}
                  maxLength={5}
                />
                {errorText("expiry")}
              </div>
              <div>
                <label htmlFor={`${uid}-cvv`} className="label">
                  CVV
                </label>
                <input
                  {...fieldProps("cvv")}
                  className="input tabular-nums"
                  type="password"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  placeholder={brand === "Amex" ? "4 digits" : "3 digits"}
                  value={value.cvv}
                  onChange={(e) =>
                    onChange({
                      cvv: e.target.value.replace(/\D/g, "").slice(0, brand === "Amex" ? 4 : 3),
                    })
                  }
                />
                {errorText("cvv")}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor={`${uid}-cardName`} className="label">
                  Name on card
                </label>
                <input
                  {...fieldProps("cardName")}
                  className="input"
                  autoComplete="cc-name"
                  placeholder="As printed on the card"
                  value={value.cardName}
                  onChange={(e) => onChange({ cardName: e.target.value })}
                />
                {errorText("cardName")}
              </div>
              <p className="text-muted flex items-center gap-2 text-sm sm:col-span-2">
                <Lock className="size-4" aria-hidden /> Card details are never stored or sent to
                analytics.
              </p>
            </fieldset>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
