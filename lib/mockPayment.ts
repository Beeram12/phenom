export type SimulatedOutcome = "random" | "success" | "failure";

const FAILURE_REASONS = [
  "Payment declined by bank",
  "UPI request timed out",
  "Insufficient funds",
] as const;

export interface PaymentResult {
  succeeded: boolean;
  reason?: string;
}

/**
 * Mock payment gateway. There is no real gateway, so this waits a moment and
 * resolves according to the chosen outcome ("random" succeeds ~85% of the time).
 */
export async function simulatePayment(
  outcome: SimulatedOutcome,
  delayMs: number,
): Promise<PaymentResult> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  const succeeded =
    outcome === "success" ? true : outcome === "failure" ? false : Math.random() < 0.85;
  if (succeeded) return { succeeded };
  return {
    succeeded,
    reason: FAILURE_REASONS[Math.floor(Math.random() * FAILURE_REASONS.length)],
  };
}
