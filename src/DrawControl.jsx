import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-draw";                       // plugin JS

export default function DrawControl({ onPolygon }) {
  const map = useMap();
  const cbRef = useRef(onPolygon);          // always point to the latest fn
  cbRef.current = onPolygon;

  useEffect(() => {
    if (!map) return;                       // install only once per Map

    const drawn = new L.FeatureGroup().addTo(map);

    const drawControl = new L.Control.Draw({
      edit: { featureGroup: drawn },
      draw: {
        polygon: true,
        rectangle: false,
        circle: false,
        polyline: false,
        marker: false,
      },
    });
    map.addControl(drawControl);

  const handleCreated = (e) => {
      cbRef.current?.(e.layer.toGeoJSON());               // hand GeoJSON up
      drawn.removeLayer(e.layer);                         // 🧹 wipe temp layer
  };
    map.on(L.Draw.Event.CREATED, handleCreated);

    // tidy up on unmount
    return () => {
      map.off(L.Draw.Event.CREATED, handleCreated);
      map.removeControl(drawControl);
      map.removeLayer(drawn);
    };
  }, [map]);                                // ← does **not** depend on onPolygon

  return null;                              // nothing visual to render
}
