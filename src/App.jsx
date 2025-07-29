import { useState, useCallback, useEffect } from "react";
import { supa } from "./lib/supa";
import dayjs from "dayjs";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

import DrawControl from "./DrawControl.jsx";
import ZoneModal from "./components/ZoneModal.jsx";
import { zoneStatus } from "./utils/zoneHelpers";
import ZoneDrawer from "./components/ZoneDrawer.jsx";
import { zoneMatchesWeeklyWindow } from "./utils/planHelpers";

const LS_KEY = "parking-zones";

export default function App() {
const [zones, setZones] = useState({ type:"FeatureCollection", features:[] });
const [plan, setPlan] = useState({
  days: [1,2,3,4,5],   // default Mon-Fri
  start: "21:00",
  end:   "00:30",
});
// 1 ► initial fetch
useEffect(() => {
  supa.from("zones")
      .select("geojson")
      .then(({ data }) =>
        setZones({ type:"FeatureCollection", features:data.map(d=>d.geojson) }));
}, []);

// 2 ► realtime subscription (broadcasts to all tabs/devices)
useEffect(() => {
  const sub = supa.channel("zones")
    .on("postgres_changes", { event:"*", schema:"public", table:"zones" },
      payload => {
        if (payload.eventType === "DELETE") {
          setZones(p => ({ ...p, features: p.features.filter(f => f.properties.id !== payload.old.id) }));
        } else {                // INSERT or UPDATE
          setZones(p => {
            const others = p.features.filter(f => f.properties.id !== payload.new.id);
            return { ...p, features:[...others, payload.new.geojson] };
          });
        }
      })
    .subscribe();
  return () => sub.unsubscribe();
}, []);

// ---------- 1 · zones state ----------
  // const [zones, setZones] = useState(() => {
  //   const saved = localStorage.getItem(LS_KEY);
  //   return saved
  //     ? JSON.parse(saved)
  //     : { type: "FeatureCollection", features: [] };
  // });

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

const handleModalSave = async (feat) => {
  // 1. optimistic UI update – keep as-is
  setZones(prev => {
    const others = prev.features.filter(f => f.properties.id !== feat.properties.id);
    return { ...prev, features: [...others, feat] };
  });

  // 2. 🔄 persist to Supabase
  await supa
    .from("zones")
    .upsert({ id: feat.properties.id, geojson: feat }, { onConflict: "id" });

  setPendingGeo(null);
  setEditingFeature(null);
};
const handleDelete = async (id) => {
  // optimistic removal from UI
  setZones(prev => ({
    ...prev,
    features: prev.features.filter(f => f.properties.id !== id),
  }));

  // 🔄 remove from Supabase
  await supa.from("zones").delete().eq("id", id);
};

  // ---------- 4 · time period (for now: "current moment") ----------
  const now = new Date();
  const nowPlus = new Date(now.getTime() + 60000); // +1 min so the loop runs
  const nowPeriod = { start: now, end: nowPlus };
  
  const toggleDay = (d) =>
  setPlan(p =>
    p.days.includes(d)
      ? { ...p, days: p.days.filter(x => x !== d) }
      : { ...p, days: [...p.days, d] }
  );

  
  // ---------- 5 · render ----------
  return (
    <>
      <div className="fixed inset-0">

      <MapContainer
        zoomControl={false}
        center={[52.633730749385165, 4.747211876277656]}
        zoom={15}
        className="h-full w-full"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <DrawControl onPolygon={handlePolygonDrawn} />

        {zones.features.map((f) => {
          /* ⇣ calculate status for THIS feature */
          const s =
            mode === "now"
              ? zoneStatus(f, new Date(), new Date(Date.now() + 60_000))
              : zoneMatchesWeeklyWindow(f, plan);

          const colour =
            s === "allowed"   ? "green"
            : s === "forbidden" ? "red"
            : "orange";

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
      fixed bottom-14 right-2 sm:bottom-auto sm:top-2                /* phone */
      sm:top-2 sm:right-2 sm:bottom-auto    /* ↗ desktop; cancel bottom-2 */
      z-[1101] rounded-md border border-gray-400 bg-white
      px-3 py-1 text-sm font-medium text-black shadow
    "
    onClick={() => setShowList(true)}
  >
    Zones
  </button>
)}

{/* responsive top toolbar */}

<div className="fixed left-1/2 top-2 z-[1101] -translate-x-1/2
                flex flex-wrap items-center gap-2 rounded-md
                border border-gray-400 bg-white px-3 py-1 text-sm text-black shadow">

  <label className="flex items-center gap-1">
    <input type="radio" name="mode" value="now"
           checked={mode==="now"} onChange={()=>setMode("now")} /> Now
  </label>

  <label className="flex items-center gap-1">
    <input type="radio" name="mode" value="plan"
           checked={mode==="plan"} onChange={()=>setMode("plan")} /> Plan
  </label>

  {mode==="plan" && (
    <>
      {/* weekday chips */}
      {["S","M","T","W","T","F","S"].map((d,i)=>(
        <button key={i}
          className={`h-7 w-7 rounded-full border
            ${plan.days.includes(i) ? "bg-blue-600 text-white" : "bg-white"}
          `}
          onClick={()=>toggleDay(i)}
        >{d}</button>
      ))}

      {/* time pickers – 24 h, never wider than viewport */}
      <input type="time" value={plan.start}
             onChange={e=>setPlan(p=>({...p,start:e.target.value}))}
             className="w-[5.5rem]"/>
      →
      <input type="time" value={plan.end}
             onChange={e=>setPlan(p=>({...p,end:e.target.value}))}
             className="w-[5.5rem]"/>
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
