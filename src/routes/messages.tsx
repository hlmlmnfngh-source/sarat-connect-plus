import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Send, Search, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/site/Header";
import { toast } from "sonner";

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [{ title: "الرسائل — سرعات" }] }),
  component: MessagesPage,
});

interface Conversation {
  id: string;
  user_a: string;
  user_b: string;
  last_message: string | null;
  last_message_at: string | null;
  other?: { id: string; full_name: string | null; avatar_url: string | null; username: string | null };
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

export default function MessagesPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<"services" | "projects">("services");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  // Load conversations
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: cs, error } = await supabase
        .from("conversations")
        .select("*")
        .order("last_message_at", { ascending: false });
      if (error) return;
      const conversations = cs ?? [];
      const otherIds = Array.from(
        new Set(conversations.map((c) => (c.user_a === user.id ? c.user_b : c.user_a))),
      );
      let profiles: Record<string, { id: string; full_name: string | null; avatar_url: string | null; username: string | null }> = {};
      if (otherIds.length) {
        const { data: ps } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, username")
          .in("id", otherIds);
        profiles = Object.fromEntries((ps ?? []).map((p) => [p.id, p]));
      }
      const enriched: Conversation[] = conversations.map((c) => ({
        ...c,
        other: profiles[c.user_a === user.id ? c.user_b : c.user_a],
      }));
      setConvs(enriched);
      if (enriched[0]) setActiveId(enriched[0].id);
    })();
  }, [user]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeId)
        .order("created_at", { ascending: true });
      setMessages(data ?? []);
    })();
  }, [activeId]);

  // Realtime subscription for new messages in the active conversation
  useEffect(() => {
    if (!activeId) return;
    const channel = supabase
      .channel(`messages:${activeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeId}` },
        (payload) => {
          setMessages((prev) => {
            const m = payload.new as Message;
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, m];
          });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeId]);

  // Realtime subscription for conversation updates (last_message)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("conv-updates")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversations" },
        (payload) => {
          const c = payload.new as Conversation;
          setConvs((prev) =>
            prev.map((p) => (p.id === c.id ? { ...p, last_message: c.last_message, last_message_at: c.last_message_at } : p))
              .sort((a, b) => (b.last_message_at ?? "").localeCompare(a.last_message_at ?? "")),
          );
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!draft.trim() || !activeId || !user) return;
    const active = convs.find((c) => c.id === activeId);
    if (!active) return;
    const receiver = active.user_a === user.id ? active.user_b : active.user_a;
    const content = draft.trim();
    setDraft("");
    const { error } = await supabase.from("messages").insert({
      conversation_id: activeId,
      sender_id: user.id,
      receiver_id: receiver,
      content,
    });
    if (error) {
      toast.error("فشل إرسال الرسالة");
      setDraft(content);
    }
  };

  const active = convs.find((c) => c.id === activeId);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header mode={mode} onModeChange={setMode} />
      <div className="container mx-auto flex-1 px-4 py-6 lg:px-6">
        <div className="grid h-[calc(100vh-160px)] gap-4 overflow-hidden rounded-2xl border border-border bg-card shadow-soft md:grid-cols-[320px_1fr]">
          {/* Conversations list */}
          <aside className="flex flex-col border-l border-border bg-muted/30">
            <div className="border-b border-border p-4">
              <h2 className="mb-3 text-lg font-extrabold text-primary">الرسائل</h2>
              <div className="relative">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  placeholder="ابحث في المحادثات..."
                  className="h-10 w-full rounded-lg border border-input bg-background pr-10 pl-3 text-sm outline-none"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {convs.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  <MessageCircle className="mx-auto mb-2 h-10 w-10 opacity-40" />
                  لا توجد محادثات بعد
                </div>
              ) : (
                convs.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    className={`flex w-full items-center gap-3 border-b border-border p-4 text-right transition hover:bg-card ${
                      activeId === c.id ? "bg-card" : ""
                    }`}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-accent font-bold text-accent-foreground">
                      {(c.other?.full_name ?? c.other?.username ?? "?")[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold">
                        {c.other?.full_name ?? c.other?.username ?? "مستخدم"}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{c.last_message ?? "ابدأ المحادثة"}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>

          {/* Chat panel */}
          <section className="flex min-h-0 flex-col">
            {!active ? (
              <div className="flex flex-1 items-center justify-center p-8 text-center text-muted-foreground">
                <div>
                  <MessageCircle className="mx-auto mb-3 h-14 w-14 opacity-30" />
                  <p>اختر محادثة لبدء الدردشة</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-border p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-accent font-bold text-accent-foreground">
                    {(active.other?.full_name ?? "?")[0]}
                  </div>
                  <div>
                    <div className="font-bold text-primary">{active.other?.full_name ?? "مستخدم"}</div>
                    <div className="text-xs text-success">● متصل الآن</div>
                  </div>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto bg-muted/20 p-4">
                  {messages.map((m) => {
                    const mine = m.sender_id === user?.id;
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-soft ${
                            mine
                              ? "rounded-br-md bg-primary text-primary-foreground"
                              : "rounded-bl-md bg-card text-foreground"
                          }`}
                        >
                          {m.content}
                          <div className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {new Date(m.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
                <form
                  onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                  className="flex items-center gap-2 border-t border-border p-3"
                >
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="اكتب رسالتك..."
                    className="h-11 flex-1 rounded-lg border border-input bg-background px-4 text-sm outline-none focus:border-accent"
                  />
                  <Button type="submit" variant="hero" size="lg" disabled={!draft.trim()}>
                    <Send className="h-4 w-4" />
                    إرسال
                  </Button>
                </form>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
