"use client";

import type { ChatMessage } from "@/lib/types";
import { useRef, useState } from "react";
import { Paperclip, Send, X } from "lucide-react";

export function ChatInput({
  onSend,
  onTyping,
  replyingTo,
  onCancelReply,
  disabled,
}: {
  onSend: (content: string, file: File | null) => void;
  onTyping: () => void;
  replyingTo: ChatMessage | null;
  onCancelReply: () => void;
  disabled: boolean;
}) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleSend() {
    if (!text.trim() && !file) return;
    onSend(text.trim(), file);
    setText("");
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="border-t border-border p-3 space-y-2">
      {replyingTo && (
        <div className="flex items-center justify-between rounded-lg bg-surface-hover px-3 py-1.5 text-xs">
          <span className="truncate">
            Respondiendo a <strong>{replyingTo.author?.display_name}</strong>: {replyingTo.content.slice(0, 60)}
          </span>
          <button onClick={onCancelReply} className="cursor-pointer text-muted hover:text-foreground shrink-0 ml-2">
            <X size={14} />
          </button>
        </div>
      )}
      {file && (
        <div className="flex items-center justify-between rounded-lg bg-surface-hover px-3 py-1.5 text-xs">
          <span className="truncate">{file.name}</span>
          <button onClick={() => setFile(null)} className="cursor-pointer text-muted hover:text-foreground shrink-0 ml-2">
            <X size={14} />
          </button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          className="h-9 w-9 flex items-center justify-center rounded-lg text-muted hover:bg-surface-hover transition-colors cursor-pointer disabled:opacity-50"
          type="button"
        >
          <Paperclip size={18} />
        </button>
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={disabled}
          placeholder={disabled ? "Únete a la comunidad para escribir" : "Escribe un mensaje…"}
          className="flex-1 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-accent disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={disabled || (!text.trim() && !file)}
          className="h-9 w-9 flex items-center justify-center rounded-lg bg-accent text-accent-foreground disabled:opacity-40 cursor-pointer"
          type="button"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
