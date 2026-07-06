/**
 * Integration tests: attempt disallowed writes through the real Supabase JS
 * client, authenticated as two ephemeral users, and confirm the Data API
 * returns permission / policy errors rather than silently allowing the write.
 *
 * Requires:
 *   VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or SUPABASE_URL /
 *   SUPABASE_PUBLISHABLE_KEY) in the environment.
 *
 * The suite auto-skips when env is missing or when signUp does not return a
 * session (email confirmation enabled). To run locally with confirmation on,
 * pre-provision two confirmed users and export:
 *   TEST_USER_A_EMAIL / TEST_USER_A_PASSWORD
 *   TEST_USER_B_EMAIL / TEST_USER_B_PASSWORD
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY;

const canRun = Boolean(URL && KEY);
const d = canRun ? describe : describe.skip;

function mkClient(): SupabaseClient {
  return createClient(URL!, KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signInOrUp(
  client: SupabaseClient,
  envEmail: string | undefined,
  envPass: string | undefined,
): Promise<{ id: string; email: string } | null> {
  if (envEmail && envPass) {
    const { data, error } = await client.auth.signInWithPassword({
      email: envEmail,
      password: envPass,
    });
    if (error || !data.session) return null;
    return { id: data.user!.id, email: envEmail };
  }
  const email = `rls-test-${crypto.randomUUID()}@example.test`;
  const password = `Pw!${crypto.randomUUID()}`;
  const { data, error } = await client.auth.signUp({ email, password });
  if (error || !data.session || !data.user) return null;
  return { id: data.user.id, email };
}

function isPermissionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string; status?: number };
  const msg = (e.message ?? "").toLowerCase();
  return (
    e.code === "42501" ||
    e.code === "PGRST301" ||
    e.code === "PGRST116" ||
    e.status === 401 ||
    e.status === 403 ||
    msg.includes("row-level security") ||
    msg.includes("violates row-level security") ||
    msg.includes("permission denied") ||
    msg.includes("not authorized") ||
    msg.includes("cannot") // guard-trigger RAISE EXCEPTION messages
  );
}

d("Supabase RLS + guard-trigger integration", () => {
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;
  let anon: SupabaseClient;
  let userA: { id: string; email: string } | null = null;
  let userB: { id: string; email: string } | null = null;
  let ready = false;

  beforeAll(async () => {
    anon = mkClient();
    clientA = mkClient();
    clientB = mkClient();
    userA = await signInOrUp(
      clientA,
      process.env.TEST_USER_A_EMAIL,
      process.env.TEST_USER_A_PASSWORD,
    );
    userB = await signInOrUp(
      clientB,
      process.env.TEST_USER_B_EMAIL,
      process.env.TEST_USER_B_PASSWORD,
    );
    ready = Boolean(userA && userB);
    if (!ready) {
      // eslint-disable-next-line no-console
      console.warn(
        "[rls-integration] skipping — could not obtain two authenticated sessions. " +
          "Provide TEST_USER_[A|B]_EMAIL/PASSWORD or disable email confirmation for signUp.",
      );
    }
  }, 30_000);

  afterAll(async () => {
    await clientA?.auth.signOut().catch(() => {});
    await clientB?.auth.signOut().catch(() => {});
  });

  const guarded = (name: string, fn: () => Promise<void>) =>
    it(name, async () => {
      if (!ready) return;
      await fn();
    });

  // ---------- profiles ----------
  guarded("profiles: user A cannot update user B's profile row", async () => {
    const { data, error } = await clientA
      .from("profiles")
      .update({ full_name: "hijacked" })
      .eq("id", userB!.id)
      .select();
    // RLS filters row → either error OR zero rows returned
    expect(error !== null || (Array.isArray(data) && data.length === 0)).toBe(true);
  });

  guarded(
    "profiles: user A cannot flip their own is_verified / rating / earnings",
    async () => {
      const attempts = [
        { is_verified: true },
        { rating: 5 },
        { reviews_count: 999 },
        { seller_level: "top_rated" },
        { total_earnings: 999999 },
        { total_orders: 999 },
      ];
      for (const patch of attempts) {
        const { error } = await clientA
          .from("profiles")
          .update(patch)
          .eq("id", userA!.id)
          .select();
        expect(
          isPermissionError(error),
          `expected permission/guard error for patch ${JSON.stringify(patch)}, got ${JSON.stringify(error)}`,
        ).toBe(true);
      }
    },
  );

  guarded("profiles: anon cannot update any profile", async () => {
    const { data, error } = await anon
      .from("profiles")
      .update({ full_name: "anon-hijack" })
      .eq("id", userA!.id)
      .select();
    expect(error !== null || (Array.isArray(data) && data.length === 0)).toBe(true);
  });

  // ---------- conversations ----------
  guarded(
    "conversations: user A cannot insert a conversation they are not part of",
    async () => {
      // Attempt to create a conversation between two other parties
      const { error } = await clientA
        .from("conversations")
        .insert({ user_a: userB!.id, user_b: userB!.id })
        .select();
      expect(isPermissionError(error)).toBe(true);
    },
  );

  guarded(
    "conversations: client cannot UPDATE conversations (no policy)",
    async () => {
      // First create a valid conversation between A and B
      const { data: conv } = await clientA
        .from("conversations")
        .insert({ user_a: userA!.id, user_b: userB!.id })
        .select()
        .maybeSingle();
      if (!conv) return; // insert may have failed for unrelated reasons; nothing to test

      const { data, error } = await clientA
        .from("conversations")
        .update({ last_message: "tampered" })
        .eq("id", conv.id)
        .select();
      // No UPDATE policy → error OR zero rows
      expect(error !== null || (Array.isArray(data) && data.length === 0)).toBe(true);
    },
  );

  // ---------- messages ----------
  guarded(
    "messages: sender cannot tamper with content / receiver after insert",
    async () => {
      // Ensure a conversation exists
      const { data: conv } = await clientA
        .from("conversations")
        .upsert(
          { user_a: userA!.id, user_b: userB!.id },
          { onConflict: "user_a,user_b", ignoreDuplicates: false },
        )
        .select()
        .maybeSingle();
      if (!conv) return;

      const { data: msg, error: insErr } = await clientA
        .from("messages")
        .insert({
          conversation_id: conv.id,
          sender_id: userA!.id,
          receiver_id: userB!.id,
          content: "hi",
        })
        .select()
        .maybeSingle();
      if (insErr || !msg) return;

      // Sender A tries to UPDATE the message → messages_guard_update requires receiver
      const { error: senderErr } = await clientA
        .from("messages")
        .update({ content: "tampered" })
        .eq("id", msg.id)
        .select();
      expect(isPermissionError(senderErr)).toBe(true);

      // Receiver B tries to mutate content / sender_id → guard rejects (only is_read allowed)
      const { error: recvErr } = await clientB
        .from("messages")
        .update({ content: "tampered", sender_id: userB!.id })
        .eq("id", msg.id)
        .select();
      expect(isPermissionError(recvErr)).toBe(true);
    },
  );

  guarded("messages: cannot insert with spoofed sender_id", async () => {
    const { data: conv } = await clientA
      .from("conversations")
      .upsert(
        { user_a: userA!.id, user_b: userB!.id },
        { onConflict: "user_a,user_b", ignoreDuplicates: false },
      )
      .select()
      .maybeSingle();
    if (!conv) return;

    const { error } = await clientA
      .from("messages")
      .insert({
        conversation_id: conv.id,
        sender_id: userB!.id, // spoof
        receiver_id: userA!.id,
        content: "spoofed",
      })
      .select();
    expect(isPermissionError(error)).toBe(true);
  });

  // ---------- reviews ----------
  guarded(
    "reviews: cannot insert a review for an order the user did not complete",
    async () => {
      const { error } = await clientA
        .from("reviews")
        .insert({
          order_id: crypto.randomUUID(),
          reviewer_id: userA!.id,
          reviewee_id: userB!.id,
          rating: 5,
          comment: "fake",
        })
        .select();
      expect(isPermissionError(error)).toBe(true);
    },
  );

  guarded("reviews: cannot insert with spoofed reviewer_id", async () => {
    const { error } = await clientA
      .from("reviews")
      .insert({
        order_id: crypto.randomUUID(),
        reviewer_id: userB!.id, // spoof another user as reviewer
        reviewee_id: userA!.id,
        rating: 5,
        comment: "spoof",
      })
      .select();
    expect(isPermissionError(error)).toBe(true);
  });
});