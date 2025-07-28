import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet-draw';

export default function useDraw(map, onSave) {
  useEffect(() => {
    if (!map) return;

    const drawn = new L.FeatureGroup().addTo(map);
    map.addControl(
      new L.Control.Draw({
        edit: { featureGroup: drawn },
        draw: { polygon: true, rectangle: false, circle: false, polyline: false, marker: false }
      })
    );

    map.on(L.Draw.Event.CREATED, (e) => {
      const layer = e.layer;
      drawn.addLayer(layer);
      onSave(layer.toGeoJSON());        // hand the polygon back to your app state
    });

    return () => map.off();
  }, [map, onSave]);
}
