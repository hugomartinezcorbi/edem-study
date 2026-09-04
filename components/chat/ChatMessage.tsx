import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/lib/types";
import { FileAttachment } from "@/components/chat/FileAttachment";

export function ChatMessage({ message, isOwn }: { message: ChatMessageType; isOwn: boolean }) {
  if (message.moderation_status === "rejected") return null;

  return (
    <div className={cn("flex gap-2.5 px-4", isOwn && "flex-row-reverse")}>
      <div className="h-8 w-8 rounded-full bg-surface-hover flex items-center justify-center text-xs font-heading font-bold shrink-0 overflow-hidden">
        {message.author?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={message.author.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          (message.author?.display_name ?? "?").slice(0, 1).toUpperCase()
        )}
      </div>

      <div className={cn("max-w-[75%] space-y-1", isOwn && "items-end flex flex-col")}>
        <div className={cn("flex items-baseline gap-2 text-xs", isOwn && "flex-row-reverse")}>
          <span className="font-medium">{message.author?.display_name ?? "Usuario"}</span>
          {message.author?.degree && (
            <span className="text-muted-light font-mono uppercase">{message.author.degree}</span>
          )}
          <span className="text-muted-light font-mono">
            {new Date(message.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        {message.moderation_status === "pending" && !isOwn ? null : (
          <div
            className={cn(
              "rounded-2xl px-3.5 py-2 text-sm",
              isOwn ? "bg-accent text-accent-foreground" : "bg-surface-hover text-foreground"
            )}
          >
            {message.moderation_status === "pending" && (
              <p className="text-xs opacity-70 mb-1">Pendiente de aprobación</p>
            )}
            {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
            {message.file_url && message.file_name && (
              <div className="mt-1">
                <FileAttachment url={message.file_url} name={message.file_name} type={message.message_type} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
