// Date formatting helpers used in the dashboard for relative and IST timestamps.
export function formatRelativeDays(
  savedAt: number,
  now: number = Date.now()
): string {
  if (!Number.isFinite(savedAt)) return "";
  const diffMs = Math.max(0, now - savedAt);
  const days = Math.floor(diffMs / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

// New unified helper providing minute/hour/day granularity.
export function formatRelativeAgo(
  savedAt: number,
  now: number = Date.now()
): string {
  if (!Number.isFinite(savedAt)) return "";
  const diffMs = Math.max(0, now - savedAt);

  const minuteMs = 60_000;
  const hourMs = 3_600_000;
  const dayMs = 86_400_000;

  // Clamp very recent and future times to minimum label of 1 minute ago
  if (diffMs < minuteMs) {
    return "1 minute ago";
  }

  if (diffMs < hourMs) {
    const minutes = Math.max(1, Math.floor(diffMs / minuteMs));
    const unit = minutes === 1 ? "minute" : "minutes";
    return `${minutes} ${unit} ago`;
  }

  if (diffMs < dayMs) {
    const hours = Math.floor(diffMs / hourMs);
    const unit = hours === 1 ? "hour" : "hours";
    return `${hours} ${unit} ago`;
  }

  const days = Math.floor(diffMs / dayMs);
  const unit = days === 1 ? "day" : "days";
  return `${days} ${unit} ago`;
}

function getOrdinalSuffix(day: number): string {
  const mod10 = day % 10;
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  if (mod10 === 1) return "st";
  if (mod10 === 2) return "nd";
  if (mod10 === 3) return "rd";
  return "th";
}

export function formatIST(savedAt: number): string {
  if (!Number.isFinite(savedAt)) return "";
  const date = new Date(savedAt);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);

  let day = "";
  let month = "";
  let year = "";
  let hour = "";
  let minute = "";
  let dayPeriod = "";

  for (const p of parts) {
    if (p.type === "day") day = p.value;
    else if (p.type === "month") month = p.value;
    else if (p.type === "year") year = p.value;
    else if (p.type === "hour") hour = p.value;
    else if (p.type === "minute") minute = p.value;
    else if (p.type === "dayPeriod") dayPeriod = p.value;
  }

  const dayNum = Number(day) || 0;
  const suffix = getOrdinalSuffix(dayNum);
  const dayWithSuffix = `${dayNum}${suffix}`;

  const hourPadded = hour.padStart(2, "0");
  const minutePadded = minute.padStart(2, "0");
  const ampm = (dayPeriod || "").toUpperCase();

  // Force IST label for clarity even if Intl returns GMT offset elsewhere
  return `${dayWithSuffix} ${month} ${year}, ${hourPadded}:${minutePadded}${ampm} IST`;
}
