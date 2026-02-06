import { TRACKS_SOURCE_ID, TRACKS_LAYER_ID } from "./constants";
import mapboxgl from "mapbox-gl";

export const addTrackLayers = (map, isDark) => {
  if (!map.getSource(TRACKS_SOURCE_ID)) {
    map.addSource(TRACKS_SOURCE_ID, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [],
      },
    });

    map.addLayer({
      id: TRACKS_LAYER_ID,
      type: "line",
      source: TRACKS_SOURCE_ID,
      paint: {
        "line-color": [
          "match",
          ["get", "deviceId"],

          // warna per device (opsional)
          1,
          "#00b7ff",
          2,
          "#ff008c",
          3,
          "#22c55e",

          // default
          "#3b82f6",
        ],
        "line-width": 2,
      },
    });
  }
};

export const updateTrackData = (map, tracksData, targetDeviceId) => {
  if (!tracksData) return;

  // tracks = array seperti [{id, name, tracks: [...]}, {...}]
  const geojson = buildAllDeviceTracks(tracksData);

  const source = map.getSource(TRACKS_SOURCE_ID);
  if (!source) return;

  //   update data
  source.setData(geojson);

  // 👉 apply dynamic color expression
  const colorExpr = buildColorExpression(geojson.features);
  map.setPaintProperty(TRACKS_LAYER_ID, "line-color", colorExpr);

  // 👉 Fit only one device by deviceId
  if (targetDeviceId !== null) {
    const feature = geojson.features.find(
      (f) => f.properties.deviceId === targetDeviceId
    );

    if (feature) {
      const bounds = new mapboxgl.LngLatBounds();
      feature.geometry.coordinates.forEach((c) => bounds.extend(c));

      map.fitBounds(bounds, { padding: 60, duration: 800 });
      return;
    }
  }

  // Fit bounds
  if (geojson.features.length > 0) {
    const bounds = new mapboxgl.LngLatBounds();
    geojson.features.forEach((f) => {
      f.geometry.coordinates.forEach((c) => bounds.extend(c));
    });

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 50, duration: 1000 });
    }
  }
};

function buildAllDeviceTracks(devicesTracks = []) {
  const features = [];

  devicesTracks.forEach((dev) => {
    const trackList = dev.hideTrack && !dev.showRoute ? [] : dev.tracks || [];
    if (trackList.length === 0) return;

    const sorted = [...trackList].sort(
      (a, b) => new Date(a.deviceTime) - new Date(b.deviceTime)
    );

    features.push({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: sorted.map((t) => [t.longitude, t.latitude]),
      },
      properties: {
        deviceId: dev.id,
        name: dev.name,
        color: dev.color,
      },
    });
  });

  return {
    type: "FeatureCollection",
    features,
  };
}

function buildColorExpression(features) {
  const expr = ["match", ["get", "deviceId"]];

  if (!features || features.length === 0) {
    // fallback default valid expression
    expr.push(-1, "#3b82f6"); // dummy condition
    expr.push("#3b82f6"); // default color
    return expr;
  }

  features.forEach((f) => {
    expr.push(f.properties.deviceId);
    expr.push(f.properties.color || "#3b82f6");
  });

  // default color
  expr.push("#3b82f6");

  return expr;
}
