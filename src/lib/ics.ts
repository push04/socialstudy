// Minimal iCalendar (.ics) generator (UTC times) with download helper
export type ICSEvent = {
  uid?: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
};

function pad(n: number){ return String(n).padStart(2, "0"); }

function toICSDateUTC(d: Date){
  const y = d.getUTCFullYear();
  const m = pad(d.getUTCMonth()+1);
  const day = pad(d.getUTCDate());
  const hh = pad(d.getUTCHours());
  const mm = pad(d.getUTCMinutes());
  const ss = pad(d.getUTCSeconds());
  return `${y}${m}${day}T${hh}${mm}${ss}Z`;
}

export function createICS(name: string, events: ICSEvent[]): string {
  const now = toICSDateUTC(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SocialStudy//Calendar//EN",
    "CALSCALE:GREGORIAN",
  ];
  for (const ev of events){
    const uid = ev.uid || `${Math.random().toString(36).slice(2)}@socialstudy`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${toICSDateUTC(ev.start)}`,
      `DTEND:${toICSDateUTC(ev.end)}`,
      `SUMMARY:${(ev.title||"Study Session").replace(/\n/g, " ")}`,
      ev.location ? `LOCATION:${ev.location.replace(/\n/g, " ")}` : "",
      ev.description ? `DESCRIPTION:${ev.description.replace(/\n/g, "\\n")}` : "",
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.filter(Boolean).join("\r\n");
}

export function downloadICS(filename: string, ics: string){
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
}
