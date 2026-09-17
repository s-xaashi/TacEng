import "server-only";

/**
 * Sifalo Pay client — every field/endpoint/behavior here comes directly
 * from https://developer.sifalopay.com. Nothing here is guessed.
 *
 * Key documented facts this code relies on:
 * - One endpoint, POST {gateway}/, does charges, hosted-checkout session
 *   creation, and refunds - differentiated by the `gateway` field.
 * - HTTP Basic auth (username:api_key) on that endpoint. verify.php uses
 *   NO auth at all.
 * - `code` 601 = paid, 603 = pending (phone approval, poll - never
 *   recharge), 604 = insufficient balance, 600 = failed, 0 = bad
 *   credentials, "404" = missing fields.
 * - Sifalo does not push webhooks ("We don't push webhooks" - docs,
 *   verbatim). All status confirmation is via server-initiated calls to
 *   verify.php, keyed by `sid` (preferred) or `order_id` (returns only
 *   the most recent payment for that id).
 * - Currency is "USD" or "SLSH" - never "SOS". Premier Wallet is USD only.
 * - Timeouts: docs specify 120 seconds (eDahab especially can be slow).
 */

const SIFALO_API_USER = process.env.SIFALO_API_USER;
const SIFALO_API_KEY = process.env.SIFALO_API_KEY;
const GATEWAY_URL = process.env.SIFALO_GATEWAY_URL; // e.g. https://api.sifalopay.com/gateway/ (live) or https://spay-api.sifalo.net/gateway/ (staging)
const CHECKOUT_URL = process.env.SIFALO_CHECKOUT_URL; // e.g. https://pay.sifalo.com/checkout/ (live) or https://pay.sifalo.net/checkout/ (staging)

export type WalletGateway = "waafi" | "edahab" | "pbwallet";

export type SifaloChargeResult = {
  code: string;
  sid?: string;
  response?: string;
};

export type SifaloCheckoutSession = {
  key: string;
  token: string;
};

export type SifaloVerifyResult = {
  sid: string;
  account?: string;
  payment_type?: "EDAHAB" | "ZAAD" | "PREMIER WALLET" | "CARD" | string;
  amount?: string;
  currency?: string;
  response?: string;
  status: "success" | "pending" | "failed" | string;
  code: string;
};

function requireConfig() {
  if (!SIFALO_API_USER || !SIFALO_API_KEY) {
    throw new Error("Server misconfigured: SIFALO_API_USER / SIFALO_API_KEY missing.");
  }
  if (!GATEWAY_URL || !CHECKOUT_URL) {
    throw new Error(
      "Server misconfigured: SIFALO_GATEWAY_URL / SIFALO_CHECKOUT_URL missing."
    );
  }
}

function basicAuthHeader(): string {
  const token = Buffer.from(`${SIFALO_API_USER}:${SIFALO_API_KEY}`).toString(
    "base64"
  );
  return `Basic ${token}`;
}

/** Docs: "Set the total HTTP timeout to 120 seconds." */
async function postToGateway(body: Record<string, unknown>): Promise<any> {
  requireConfig();
  const res = await fetch(GATEWAY_URL!, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  return res.json();
}

/**
 * Direct wallet charge (Waafi/eDahab/Premier). This is the "e-Wallet API"
 * flow - the officially documented way to build your own custom UI that
 * only ever collects a wallet phone/account number, never a PIN/OTP.
 */
export async function chargeWallet(params: {
  account: string;
  gateway: WalletGateway;
  amount: string;
  currency: "USD" | "SLSH";
  order_id: string;
}): Promise<SifaloChargeResult> {
  const data = await postToGateway({
    account: params.account,
    gateway: params.gateway,
    amount: params.amount,
    currency: params.currency,
    order_id: params.order_id,
  });
  return { code: String(data.code), sid: data.sid, response: data.response };
}

/**
 * Start a hosted-checkout session (cards, or any method via Sifalo's own
 * page). Docs: amount/gateway="checkout"/currency/return_url all required;
 * order_id must be on the return_url query string, not a top-level field.
 */
export async function startHostedCheckout(params: {
  amount: string;
  currency: "USD";
  return_url: string;
}): Promise<SifaloCheckoutSession> {
  const data = await postToGateway({
    amount: params.amount,
    gateway: "checkout",
    currency: params.currency,
    return_url: params.return_url,
  });
  if (!data.key || !data.token) {
    throw new Error(
      `Sifalo did not return a checkout session: ${JSON.stringify(data)}`
    );
  }
  return { key: data.key, token: data.token };
}

export function buildCheckoutRedirectUrl(session: SifaloCheckoutSession): string {
  requireConfig();
  const url = new URL(CHECKOUT_URL!);
  url.searchParams.set("key", session.key);
  url.searchParams.set("token", session.token);
  return url.toString();
}

/**
 * Docs: verify.php takes NO Basic auth - JSON body only, {sid} preferred,
 * {order_id} as a fallback (returns only the most recent payment for that id).
 */
export async function verifyTransaction(params: {
  sid?: string;
  order_id?: string;
}): Promise<SifaloVerifyResult> {
  requireConfig();
  const verifyUrl = new URL("verify.php", GATEWAY_URL!).toString();
  const res = await fetch(verifyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      params.sid ? { sid: params.sid } : { order_id: params.order_id }
    ),
    signal: AbortSignal.timeout(120_000),
  });
  const data = await res.json();
  return {
    sid: data.sid,
    account: data.account,
    payment_type: data.payment_type,
    amount: data.amount,
    currency: data.currency,
    response: data.response,
    status: data.status,
    code: String(data.code),
  };
}

/** Docs: only mark paid if status === "success" && code === 601. */
export function isVerifiedPaid(result: SifaloVerifyResult): boolean {
  return result.status === "success" && result.code === "601";
}
