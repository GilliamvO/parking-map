// src/components/ZoneModal.jsx
import { useEffect, useRef } from "react";

/**
 * Props
 * ─ open   : boolean                    ⇢ dialog visible?
 * ─ rawGeo : plain GeoJSON Feature      ⇢ geometry + (maybe) properties
 * ─ onCancel()                          ⇢ close without saving
 * ─ onSave(fullFeature)                 ⇢ send back finished feature
 */
export default function ZoneModal({ open, rawGeo, onCancel, onSave }) {
  const dlgRef  = useRef(null);
  const formRef = useRef(null);

  /* ─── imperatively show / hide dialog ───────────────────── */
  useEffect(() => {
    const dlg = dlgRef.current;
    if (!dlg) return;
    if (open) {
      if (!dlg.open) dlg.showModal();
    } else {
      if (dlg.open) dlg.close();
    }
  }, [open]);

  /* ─── form submit → build feature + hand to parent ──────── */
  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(formRef.current);

    const ui = {
      name:    fd.get("name").trim() || "Unnamed zone",
      days:    [...fd.getAll("days")].map(Number),
      start:   fd.get("start"),
      end:     fd.get("end"),
      allowed: fd.get("mode") === "allowed",
    };

    /* keep existing id when editing, generate new when adding */
    const id = rawGeo?.properties?.id ?? crypto.randomUUID();

    onSave({
      ...rawGeo,
      properties: {
        id,
        name: ui.name,
        rules: [
          {
            days: ui.days,
            start: ui.start,
            end: ui.end,
            allowed: ui.allowed,
          },
        ],
      },
    });
  };

  /* ─── nothing gets rendered if modal is closed ──────────── */
  if (!open) return null;

  /* helpers for default values when editing */
  const defaults = rawGeo?.properties?.rules?.[0] ?? {};
  const defaultDays = defaults.days ?? [];
  const defaultAllowed = defaults.allowed ?? false;

  return (
    <dialog ref={dlgRef} className="zone-dialog">
      <form ref={formRef} onSubmit={handleSubmit}>
        <h3 style={{marginTop:0}}>
          {rawGeo?.properties?.id ? "Edit zone" : "Add zone"}
        </h3>

        {/* name */}
        <label>
          Name&nbsp;
          <input
            name="name"
            placeholder="e.g. Main Street"
            defaultValue={rawGeo?.properties?.name || ""}
            style={{width:"100%"}}
          />
        </label>

        {/* weekdays */}
        <fieldset style={{border:"none",padding:0}}>
          <legend>Days</legend>
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d,i)=>(
            <label key={d} style={{marginRight:"0.5rem"}}>
              <input
                type="checkbox"
                name="days"
                value={i}
                defaultChecked={
                  defaultDays.length
                    ? defaultDays.includes(i)
                    : i>=4 && i<=6      /* Thu-Sat default */
                }
              /> {d}
            </label>
          ))}
        </fieldset>

        {/* time range */}
        <label>
          Start&nbsp;
          <input
            type="time"
            name="start"
            required
            defaultValue={defaults.start || "21:00"}
          />
        </label>{" "}
        <label>
          End&nbsp;
          <input
            type="time"
            name="end"
            required
            defaultValue={defaults.end || "00:30"}
          />
        </label>

        {/* allowed / forbidden */}
        <div style={{margin:"0.5rem 0"}}>
          <label>
            <input
              type="radio"
              name="mode"
              value="forbidden"
              defaultChecked={!defaultAllowed}
            />{" "}
            Forbidden
          </label>{" "}
          <label>
            <input
              type="radio"
              name="mode"
              value="allowed"
              defaultChecked={defaultAllowed}
            />{" "}
            Allowed
          </label>
        </div>

        {/* buttons */}
        <div style={{display:"flex",justifyContent:"flex-end",gap:"0.5rem"}}>
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="submit">Save</button>
        </div>
      </form>

      {/* quick inline styling – move to Tailwind/CSS later */}
      <style>{`
        dialog.zone-dialog {
          border:none;
          padding:1rem 1.25rem;
          border-radius:8px;
          max-width:320px;
          width:90%;
          box-shadow:0 6px 24px rgba(0,0,0,.25);
          z-index:1000;
        }
        fieldset label {font-size:.9rem}
        input[type="time"] {font-size:.9rem}
        input[type="text"], input[type="time"] {border:1px solid #ccc;border-radius:4px;padding:2px 4px;}
        button {padding:4px 12px;border-radius:6px;border:1px solid #888;background:#eee;cursor:pointer;}
        button:hover {background:#ddd;}
      `}</style>
    </dialog>
  );
}
