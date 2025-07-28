import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(isBetween);

/* ---------- low-level helpers ---------- */
export function ruleAppliesAt(rule, minute) {
  if (!rule.days.includes(minute.day())) return false;

  const [sh, sm] = rule.start.split(":").map(Number);
  const [eh, em] = rule.end.split(":").map(Number);

  const start = minute.clone().hour(sh).minute(sm);
  const end   = minute.clone().hour(eh).minute(em);

  return start.isBefore(end)
    ? minute.isBetween(start, end, null, "[)")
    : minute.isAfter(start) || minute.isBefore(end);
}

export function allowedAt(zone, minute) {
  let allowed = true;                      // default permissive
  for (const r of zone.properties.rules) {
    if (ruleAppliesAt(r, minute)) allowed = r.allowed;
  }
  return allowed;
}

/* ---------- whole-period status ---------- */
export function zoneStatus(zone, from, to) {
  const start = dayjs(from);
  const end   = dayjs(to);

  /* 1-minute “now” period support */
  if (!start.isBefore(end)) {
    return allowedAt(zone, start) ? "allowed" : "forbidden";
  }

  let anyAllowed = false;
  let anyForbidden = false;

  let t = start.clone();
  while (t.isBefore(end)) {
    allowedAt(zone, t) ? (anyAllowed = true) : (anyForbidden = true);
    if (anyAllowed && anyForbidden) return "partial";
    t = t.add(1, "minute");
  }
  return anyForbidden ? "forbidden" : "allowed";
}
