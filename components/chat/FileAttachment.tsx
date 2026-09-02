import { FileText, Image as ImageIcon } from "lucide-react";

export function FileAttachment({ url, name, type }: { url: string; name: string; type: string }) {
  if (type === "image") {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block max-w-xs">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={name} className="rounded-xl border border-border max-h-60 object-cover" />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm max-w-xs hover:bg-surface-hover transition-colors"
    >
      <FileText size={18} className="text-accent shrink-0" />
      <span className="truncate">{name}</span>
    </a>
  );
}

export function FileTypeIcon({ type }: { type: string }) {
  return type === "image" ? <ImageIcon size={14} /> : <FileText size={14} />;
}
