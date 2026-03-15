"use client";

export function LocalTime({ date }: { date: string }) {
  return (
    <p className="text-xs text-muted-foreground mt-1">
      {new Date(date).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}
    </p>
  );
}
