export default function ZoneDrawer({
  zones,
  period,          /* may arrive undefined for one render tick */
  zoneStatus,
  onEdit,
  onDelete,
  onClose, 
}) {
  /* fallback to a 1-minute “now” window if prop is absent */
  const safePeriod = period ?? {
    start: new Date(),
    end:   new Date(Date.now() + 60_000),
  }; 
  return (
    <aside
      className="
        fixed z-[1100] bg-white text-black shadow
        sm:top-0 sm:right-0 sm:w-52 sm:max-h-screen sm:overflow-y-auto
        bottom-0 left-0 right-0 max-h-80 overflow-y-auto
        rounded-t-lg sm:rounded-none
        transition-transform duration-300
      "
    >
      <div className="mx-2 mt-1 mb-1 flex items-center justify-between">
        <h3 className="font-semibold">Zones</h3>
        <button
          onClick={onClose}
          className="rounded px-2 text-lg text-gray-600 hover:text-black"
          aria-label="Hide list"
        >
          ✕
        </button>
      </div>      {zones.features.length === 0 && (
        <p className="mx-2 mb-2 text-xs">No zones yet</p>
      )}

      {zones.features.map((f) => {
        const s = zoneStatus(f, safePeriod.start, safePeriod.end);
        const colour =
          s === "allowed" ? "bg-green-500" : s === "forbidden" ? "bg-red-500" : "bg-orange-400";
        return (
          <div
            key={f.properties.id}
            className="mx-2 my-1 flex items-center gap-2 text-sm"
          >
            <span className={`h-3 w-3 rounded ${colour}`} />
            <button
              onClick={() => onEdit(f)}
              className="flex-1 text-left underline-offset-2 hover:underline"
            >
              {f.properties.name}
            </button>
            <button
              onClick={() => onDelete(f.properties.id)}
              className="text-red-600 hover:text-red-800"
            >
              🗑️
            </button>
          </div>
        );
      })}
    </aside>
  );
}
