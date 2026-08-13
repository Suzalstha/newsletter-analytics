export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return minutes === 0 ? `${seconds}s` : `${minutes}m ${seconds}s`;
}

export function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString();
}

export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Formats a UTC instant in a specific IANA timezone (the company's configured timezone),
// not the viewer's browser timezone -- used for scheduled-send times so every admin sees
// the same wall-clock time regardless of where they are.
export function formatInTimeZone(isoDate: string, timeZoneId: string): string {
  return new Date(isoDate).toLocaleString(undefined, {
    timeZone: timeZoneId,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Splits a UTC instant into the local wall-clock {date, time} strings for the given
// timezone, in the shapes <input type="date"> / <input type="time"> expect -- used to
// pre-fill the schedule form when editing an existing schedule.
export function toDateTimeInputParts(isoDate: string, timeZoneId: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZoneId,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(isoDate));

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}
