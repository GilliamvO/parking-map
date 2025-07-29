import dayjs from "dayjs";

export function zoneMatchesWeeklyWindow(zone, plan) {
  // If *any* minute in the requested window is forbidden → return "forbidden"
  const { days, start, end } = plan;

  for (const rule of zone.properties.rules) {
    // We only care about rules that coincide with the plan’s weekdays
    if (!days.every(d => rule.days.includes(d))) continue;

    if (rule.start === start && rule.end === end) {
      return rule.allowed ? "allowed" : "forbidden";
    }
  }
  return "partial";
}
