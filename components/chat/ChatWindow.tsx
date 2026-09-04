"use client";

import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { createClient } from "@/lib/supabase/client";
import { subscribeToChat } from "@/lib/realtime";
import type { ChatMessage as ChatMessageType, UserProfile } from "@/lib/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

export function ChatWindow({
  initialMessages,
  currentUser,
}: {
  initialMessages: ChatMessageType[];
  currentUser: UserProfile;
}) {
  const supabase = createClient();
  const [messages, setMessages] = useState<ChatMessageType[]>(initialMessages);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(initialMessages.length >= 50);

  const scrollRef = useRef<HTMLDivElement>(null);
  const profileCache = useRef<Map<string, UserProfile>>(new Map());
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<typeof subscribeToChat>["channel"] | null>(null);
  const shouldStickToBottom = useRef(true);

  useEffect(() => {
    for (const m of initialMessages) if (m.author) profileCache.current.set(m.user_id, m.author);
  }, [initialMessages]);

  const handleIncoming = useCallback(
    async (message: ChatMessageType) => {
      if (message.community_subject_id) return;
      let author = profileCache.current.get(message.user_id);
      if (!author) {
        const { data } = await supabase.from("user_profiles").select("*").eq("id", message.user_id).single();
        if (data) {
          author = data as UserProfile;
          profileCache.current.set(message.user_id, author);
        }
      }
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, { ...message, author }]));
    },
    [supabase]
  );

  useEffect(() => {
    const { channel, unsubscribe } = subscribeToChat(supabase, handleIncoming, (typingIds) => {
      setTypingUsers((prev) => {
        const next: Record<string, string> = {};
        for (const id of typingIds) {
          if (id === currentUser.id) continue;
          next[id] = profileCache.current.get(id)?.display_name ?? prev[id] ?? "Alguien";
        }
        return next;
      });
    });
    channelRef.current = channel;
    channel.track({ user_id: currentUser.id, typing: false });

    return () => {
      unsubscribe();
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (shouldStickToBottom.current) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }
  }, [messages]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    shouldStickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (el.scrollTop < 80 && hasMore && !loadingOlder) loadOlder();
  }

  async function loadOlder() {
    if (messages.length === 0) return;
    setLoadingOlder(true);
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    try {
      const res = await fetch(`/api/chat/messages?before=${messages[0].created_at}`);
      const body = await res.json();
      const older: ChatMessageType[] = body.messages ?? [];
      if (older.length < 50) setHasMore(false);
      if (older.length > 0) {
        setMessages((prev) => [...older, ...prev]);
        requestAnimationFrame(() => {
          if (el) el.scrollTop = el.scrollHeight - prevHeight;
        });
      }
    } finally {
      setLoadingOlder(false);
    }
  }

  function handleTyping() {
    channelRef.current?.track({ user_id: currentUser.id, typing: true });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      channelRef.current?.track({ user_id: currentUser.id, typing: false });
    }, 2000);
  }

  async function handleSend(content: string, file: File | null) {
    let fileUrl: string | undefined;
    let fileName: string | undefined;
    let messageType = "text";

    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/chat/upload", { method: "POST", body: formData });
      const body = await res.json();
      if (res.ok) {
        fileUrl = body.fileUrl;
        fileName = body.fileName;
        messageType = body.messageType;
      }
    }

    const optimisticId = `optimistic-${crypto.randomUUID()}`;
    const optimistic: ChatMessageType = {
      id: optimisticId,
      community_subject_id: null,
      user_id: currentUser.id,
      content,
      message_type: messageType as ChatMessageType["message_type"],
      file_url: fileUrl ?? null,
      file_name: fileName ?? null,
      reply_to_id: null,
      is_pinned: false,
      is_deleted: false,
      moderation_status: "approved",
      created_at: new Date().toISOString(),
      edited_at: null,
      author: currentUser,
    };
    setMessages((prev) => [...prev, optimistic]);

    const res = await fetch("/api/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, fileUrl, fileName, messageType }),
    });
    const body = await res.json();
    setMessages((prev) =>
      res.ok
        ? prev.map((m) => (m.id === optimisticId ? { ...body.message, author: currentUser } : m))
        : prev.filter((m) => m.id !== optimisticId)
    );
  }

  const filtered = searchQuery
    ? messages.filter((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;
  const typingNames = Object.values(typingUsers);

  return (
    <div className="flex flex-col h-[75vh] border border-border rounded-2xl overflow-hidden bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <p className="font-medium text-sm">#chat-general</p>
        <button onClick={() => setShowSearch((v) => !v)} className="text-muted hover:text-foreground cursor-pointer">
          <Search size={16} />
        </button>
      </div>

      {showSearch && (
        <div className="px-4 py-2 border-b border-border">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar en el chat…"
            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-accent"
          />
        </div>
      )}

      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto py-4 space-y-3">
        {loadingOlder && <p className="text-center text-xs text-muted">Cargando mensajes anteriores…</p>}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted py-12">Sé el primero en escribir aquí.</p>
        )}
        {filtered.map((m) => (
          <ChatMessage key={m.id} message={m} isOwn={m.user_id === currentUser.id} />
        ))}
      </div>

      <div className="px-4">
        <TypingIndicator names={typingNames} />
      </div>

      <ChatInput onSend={handleSend} onTyping={handleTyping} disabled={false} />
    </div>
  );
}
