import type { ChatMessage as ChatMessageType } from "@/lib/types";
import { FileAttachment } from "@/components/chat/FileAttachment";
import { usernameColor } from "@/lib/chatColors";

export function ChatMessage({ message }: { message: ChatMessageType }) {
  if (message.moderation_status === "rejected") return null;

  const name = message.author?.display_name ?? "Usuario";
  const color = usernameColor(message.user_id);

  return (
    <div className="px-4 py-0.5 text-sm leading-relaxed hover:bg-surface-hover/60 transition-colors">
      <span className="text-muted-light font-mono text-[11px] mr-1.5">
        {new Date(message.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
      </span>
      {message.author?.degree && (
        <span className="text-muted-light font-mono text-[10px] uppercase mr-1 align-middle">
          [{message.author.degree}]
        </span>
      )}
      <span className="font-bold" style={{ color }}>
        {name}
      </span>
      <span className="text-foreground">: </span>
      {message.content && <span className="break-words whitespace-pre-wrap">{message.content}</span>}
      {message.moderation_status === "pending" && (
        <span className="text-muted-light text-xs italic ml-1.5">(pendiente de aprobación)</span>
      )}
      {message.file_url && message.file_name && (
        <div className="mt-1 mb-1.5 inline-block align-top">
          <FileAttachment url={message.file_url} name={message.file_name} type={message.message_type} />
        </div>
      )}
    </div>
  );
}
