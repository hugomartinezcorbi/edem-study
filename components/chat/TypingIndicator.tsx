export function TypingIndicator({ names }: { names: string[] }) {
  if (names.length === 0) return <div className="h-5" />;
  const text =
    names.length === 1
      ? `${names[0]} está escribiendo…`
      : names.length === 2
        ? `${names[0]} y ${names[1]} están escribiendo…`
        : `${names.length} personas están escribiendo…`;

  return (
    <div className="h-5 px-1 flex items-center gap-1.5 text-xs text-muted">
      <span className="flex gap-0.5">
        <span className="h-1 w-1 rounded-full bg-muted animate-bounce [animation-delay:-0.3s]" />
        <span className="h-1 w-1 rounded-full bg-muted animate-bounce [animation-delay:-0.15s]" />
        <span className="h-1 w-1 rounded-full bg-muted animate-bounce" />
      </span>
      {text}
    </div>
  );
}
