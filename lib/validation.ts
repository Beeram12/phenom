/** Validators return an error message, or null when the value is valid. */

export function validateName(value: string): string | null {
  const v = value.trim();
  if (!v) return "Please enter your name.";
  if (v.length < 2) return "Name should be at least 2 characters.";
  if (!/^[\p{L} .'-]+$/u.test(v)) return "Name can only contain letters, spaces, . ' and -.";
  return null;
}

/** Indian mobile numbers: 10 digits starting 6–9, optional +91 / 0 prefix. */
export function validatePhone(value: string): string | null {
  const digits = value.replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, "");
  if (!digits) return "Please enter your phone number.";
  if (!/^[6-9]\d{9}$/.test(digits)) return "Enter a valid 10-digit mobile number.";
  return null;
}

export function validateAddress(value: string): string | null {
  const v = value.trim();
  if (!v) return "Please enter your delivery address.";
  if (v.length < 10) return "Please add a bit more detail (house no., street, area).";
  return null;
}

export const UPI_ID_PATTERN = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/;

export function validateUpiId(value: string): string | null {
  const v = value.trim();
  if (!v) return "Please enter your UPI ID.";
  if (!UPI_ID_PATTERN.test(v)) return "UPI ID should look like name@bank.";
  return null;
}

export type CardBrand = "Visa" | "Mastercard" | "RuPay" | "Amex" | null;

export function detectCardBrand(digits: string): CardBrand {
  if (/^4/.test(digits)) return "Visa";
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "Amex";
  if (/^(60|65|81|82|508|353|356)/.test(digits)) return "RuPay";
  return null;
}

export function luhnCheck(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

/** "4111111111111111" -> "4111 1111 1111 1111" (Amex: 4-6-5). */
export function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 19);
  if (detectCardBrand(digits) === "Amex") {
    return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)]
      .filter(Boolean)
      .join(" ");
  }
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

export function validateCardNumber(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "Please enter your card number.";
  if (digits.length < 13 || digits.length > 19 || !luhnCheck(digits)) {
    return "That card number doesn't look right.";
  }
  return null;
}

/** "0427" -> "04/27" */
export function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length === 1 && Number(digits) > 1) return `0${digits}/`;
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function validateExpiry(value: string, now = new Date()): string | null {
  const match = /^(\d{2})\/(\d{2})$/.exec(value.trim());
  if (!match) return "Use the MM/YY format.";
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return "Month should be between 01 and 12.";
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);
  if (endOfMonth < now) return "This card has expired.";
  return null;
}

export function validateCvv(value: string, brand: CardBrand): string | null {
  const expected = brand === "Amex" ? 4 : 3;
  if (!value) return "Please enter the CVV.";
  if (!new RegExp(`^\\d{${expected}}$`).test(value)) return `CVV should be ${expected} digits.`;
  return null;
}

export function validateCardName(value: string): string | null {
  const v = value.trim();
  if (!v) return "Please enter the name on the card.";
  if (!/^[a-zA-Z .'-]{2,}$/.test(v)) return "Use the name as printed on the card.";
  return null;
}
