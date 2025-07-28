import { useState, useCallback, useEffect } from "react";
import dayjs from "dayjs";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

import DrawControl from "./DrawControl.jsx";
import ZoneModal from "./components/ZoneModal.jsx";
import { zoneStatus } from "./utils/zoneHelpers";
import ZoneDrawer from "./components/ZoneDrawer.jsx";

const LS_KEY = "parking-zones";

export default function App() {
  // ---------- 1 · zones state ----------
  const [zones, setZones] = useState(() => {
    const saved = localStorage.getItem(LS_KEY);
    return saved
      ? JSON.parse(saved)
      : { type: "FeatureCollection", features: [] };
  });

  // ---------- 2 · modal control ----------
const [pendingGeo, setPendingGeo]   = useState(null); // create mode
const [editingFeature, setEditingFeature] = useState(null); // edit mode
const [showList, setShowList] = useState(false);

// ─── mode & period ───────────────────────────────────────────
const [mode, setMode] = useState("now");            // 'now' | 'plan'
const [planFrom, setPlanFrom] = useState(() => dayjs().startOf("hour"));
const [planTo,   setPlanTo]   = useState(() => dayjs().startOf("hour").add(1,"hour"));

const period = mode === "now"
  ? { start: new Date(), end: new Date(Date.now() + 60_000) }        // now → now+1 min
  : { start: planFrom.toDate(), end: planTo.toDate() };

  const handlePolygonDrawn = useCallback((rawGeo) => {
    setPendingGeo(rawGeo); // opens the modal
  }, []);

const handleModalCancel = () => {
  setPendingGeo(null);
  setEditingFeature(null);
};

const handleModalSave = (feat) => {
  setZones((prev) => {
    const exists = prev.features.find((f) => f.properties.id === feat.properties.id);
    return exists
      ? { ...prev, features: prev.features.map((f) => (f.properties.id === feat.properties.id ? feat : f)) }
      : { ...prev, features: [...prev.features, feat] };
  });
  setPendingGeo(null);
  setEditingFeature(null);
};
const handleDelete = (id) =>
  setZones((prev) => ({
    ...prev,
    features: prev.features.filter((f) => f.properties.id !== id),
  }));
  // ---------- 3 · persist every change ----------
  useEffect(
    () => localStorage.setItem(LS_KEY, JSON.stringify(zones)),
    [zones]
  );

  // ---------- 4 · time period (for now: "current moment") ----------
  const now = new Date();
  const nowPlus = new Date(now.getTime() + 60000); // +1 min so the loop runs
  const nowPeriod = { start: now, end: nowPlus };
  // ---------- 5 · render ----------
  return (
    <>
      <div className="fixed inset-0">

      <MapContainer
        center={[52.633730749385165, 4.747211876277656]}
        zoom={15}
        className="h-full w-full"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <DrawControl onPolygon={handlePolygonDrawn} />

        {zones.features.map((f) => {
            const s = zoneStatus(f, period.start, period.end);
            const colour =
              s === "allowed"   ? "green"  :
              s === "forbidden" ? "red"    : "orange";

            return (
              <GeoJSON
                key={f.properties.id}
                data={f}
                style={{ color: colour, weight: 2, fillOpacity: 0.4 }}
                eventHandlers={{
                  click: () => setEditingFeature(f),   // opens the modal for this zone
                }}
              />
            );
          })}
      </MapContainer>
      </div>
  {/* toggle list */}
 {/* <button
  className="
    fixed bottom-2 right-2 sm:top-2 sm:right-2
    z-[1101] rounded-md border border-gray-400 bg-white
    px-3 py-1 text-sm font-medium text-black shadow
  "
  onClick={() => setShowList(p => !p)}
>
  {showList ? "Hide list" : "Show list"}
</button> */}
  {/* ─── Mode / Period toolbar ─────────────────────────── */}
{/* Zones toggle – appears only while drawer is closed */}
{!showList && (
  <button
    className="
      fixed bottom-2 right-2                /* phone */
      sm:top-2 sm:right-2 sm:bottom-auto    /* ↗ desktop; cancel bottom-2 */
      z-[1101] rounded-md border border-gray-400 bg-white
      px-3 py-1 text-sm font-medium text-black shadow
    "
    onClick={() => setShowList(true)}
  >
    Zones
  </button>
)}
<div
  className="
    fixed left-1/2 top-2 z-[1101] -translate-x-1/2
    flex items-center gap-3 rounded-md border border-gray-400
    bg-white px-4 py-1 text-sm text-black shadow
  "
>
  <label>
    <input
      type="radio"
      name="mode"
      value="now"
      checked={mode==="now"}
      onChange={()=>setMode("now")}
    /> Now
  </label>

  <label>
    <input
      type="radio"
      name="mode"
      value="plan"
      checked={mode==="plan"}
      onChange={()=>setMode("plan")}
    /> Plan
  </label>

  {mode==="plan" && (
    <>
      <input
        type="datetime-local"
        value={planFrom.format("YYYY-MM-DDTHH:mm")}
        onChange={(e)=>setPlanFrom(dayjs(e.target.value))}
        max={planTo.format("YYYY-MM-DDTHH:mm")}
        style={{fontSize:".85rem"}}
      />
      →
      <input
        type="datetime-local"
        value={planTo.format("YYYY-MM-DDTHH:mm")}
        onChange={(e)=>setPlanTo(dayjs(e.target.value))}
        min={planFrom.format("YYYY-MM-DDTHH:mm")}
        style={{fontSize:".85rem"}}
      />
    </>
  )}
</div>  
  {showList && (
    <ZoneDrawer
      zones={zones}
      nowPeriod={nowPeriod}
      onEdit={(f)=>setEditingFeature(f)}
      onDelete={handleDelete}
      zoneStatus={zoneStatus}
      onClose={() => setShowList(false)}
    />
  )}

      <ZoneModal
        open={!!pendingGeo || !!editingFeature}
        rawGeo={pendingGeo || editingFeature}
        onCancel={handleModalCancel}
        onSave={handleModalSave}
      />
    </>
    
);
}
