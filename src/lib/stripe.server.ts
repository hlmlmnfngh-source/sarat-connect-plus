// Minimal Stripe REST helper. The Worker SSR runtime has no Node host, so we
// talk to Stripe over fetch instead of pulling in the Node SDK.
function encode(prefix: string, value: unknown, out: URLSearchParams) {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) {
    value.forEach((v, i) => encode(`${prefix}[${i}]`, v, out));
  } else if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      encode(`${prefix}[${k}]`, v, out);
    }
  } else {
    out.set(prefix, String(value));
  }
}

export function toForm(payload: Record<string, unknown>) {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(payload)) encode(k, v, out);
  return out;
}

export async function stripeRequest<T>(
  path: string,
  payload?: Record<string, unknown>,
): Promise<T> {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new Error("Stripe is not configured.");
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: payload ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      "Stripe-Version": "2025-08-27.basil",
      ...(payload ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    ...(payload ? { body: toForm(payload).toString() } : {}),
  });
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) {
    console.error("Stripe API error", path, json?.error);
    throw new Error(json?.error?.message ?? "Stripe request failed.");
  }
  return json;
}
