import mapboxgl from "mapbox-gl";
import {
  DEVICE_SOURCE_ID,
  CLUSTER_LAYER_ID,
  CLUSTER_COUNT_LAYER_ID,
  UNCLUSTERED_LAYER_ID,
  UNCLUSTERED_DIRECTION_LAYER_ID,
  UNCLUSTERED_LABEL_LAYER_ID,
  CLUSTER_RADIUS,
  CLUSTER_MAX_ZOOM,
  FIT_BOUNDS_PADDING,
  FIT_BOUNDS_MAX_ZOOM,
} from "./constants";
import { openPopupFromFeature, closePopup } from "./popupUtils";

export const setDeviceLabelVisibility = (map, focusedDeviceId) => {
  if (!map || !map.getLayer(UNCLUSTERED_LABEL_LAYER_ID)) return;

  if (focusedDeviceId) {
    map.setPaintProperty(UNCLUSTERED_LABEL_LAYER_ID, 'text-opacity',
      ['case', ['==', ['get', 'deviceId'], Number(focusedDeviceId)], 0, 1]
    );
  } else {
    map.setPaintProperty(UNCLUSTERED_LABEL_LAYER_ID, 'text-opacity', 1);
  }
};

export const addDeviceLayers = (
  map,
  isDark,
  currentPopupRef,
  focusedDeviceIdRef
) => {
  if (!map) return;

  ensureArrowImage(map);

  closePopup(currentPopupRef);
  if (focusedDeviceIdRef) {
    focusedDeviceIdRef.current = null;
  }

  // Remove existing layers and source
  if (map.getLayer(CLUSTER_LAYER_ID)) map.removeLayer(CLUSTER_LAYER_ID);
  if (map.getLayer(CLUSTER_COUNT_LAYER_ID))
    map.removeLayer(CLUSTER_COUNT_LAYER_ID);
  if (map.getLayer(UNCLUSTERED_DIRECTION_LAYER_ID))
    map.removeLayer(UNCLUSTERED_DIRECTION_LAYER_ID);
  if (map.getLayer(UNCLUSTERED_LABEL_LAYER_ID))
    map.removeLayer(UNCLUSTERED_LABEL_LAYER_ID);
  if (map.getLayer(UNCLUSTERED_LAYER_ID)) map.removeLayer(UNCLUSTERED_LAYER_ID);
  if (map.getSource(DEVICE_SOURCE_ID)) map.removeSource(DEVICE_SOURCE_ID);

  // Add source
  map.addSource(DEVICE_SOURCE_ID, {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: [],
    },
    cluster: true,
    clusterRadius: CLUSTER_RADIUS,
    clusterMaxZoom: CLUSTER_MAX_ZOOM,
  });

  // Cluster layer
  map.addLayer({
    id: CLUSTER_LAYER_ID,
    type: "circle",
    source: DEVICE_SOURCE_ID,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": isDark ? "#2563eb" : "#1d4ed8",
      "circle-radius": ["step", ["get", "point_count"], 15, 5, 20, 25, 25],
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.8,
    },
  });

  // Cluster count layer
  map.addLayer({
    id: CLUSTER_COUNT_LAYER_ID,
    type: "symbol",
    source: DEVICE_SOURCE_ID,
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
      "text-size": 12,
    },
    paint: {
      "text-color": "#e0f2fe",
    },
  });

  // Unclustered point layer
  map.addLayer({
    id: UNCLUSTERED_LAYER_ID,
    type: "circle",
    source: DEVICE_SOURCE_ID,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": [
        "match",
        ["get", "status"],
        "online",
        "#16a34a",
        "offline",
        "#dc2626",
        "#a1a1aa",
      ],
      "circle-radius": 8,
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 2,
    },
  });

  // Direction layer
  map.addLayer({
    id: UNCLUSTERED_DIRECTION_LAYER_ID,
    type: "symbol",
    source: DEVICE_SOURCE_ID,
    filter: ["!", ["has", "point_count"]],
    layout: {
      "icon-image": "device-arrow",
      "icon-size": 0.5,
      "icon-rotate": ["get", "course"],
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
      "icon-rotation-alignment": "map",
    },
    paint: {
      "icon-color": "#ffffff",
    },
  });

  // Label layer
  map.addLayer({
    id: UNCLUSTERED_LABEL_LAYER_ID,
    type: "symbol",
    source: DEVICE_SOURCE_ID,
    filter: ["!", ["has", "point_count"]],
    layout: {
      "text-field": ["get", "name"],
      "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
      "text-size": 12,
      "text-anchor": "bottom",
      "text-offset": [0, -1],
      "text-allow-overlap": true,
      "text-ignore-placement": false,
    },
    paint: {
      "text-color": isDark ? "#ffffff" : "#4c5368",
      "text-halo-color": isDark ? "#000000" : "#ffffff",
      "text-halo-width": 1,
      "text-opacity-transition": { "duration": 0 },
    },
  });

  // Restore visibility state
  if (focusedDeviceIdRef && focusedDeviceIdRef.current) {
    setDeviceLabelVisibility(map, focusedDeviceIdRef.current);
  }

  // Set up event handlers
  setupDeviceLayerEvents(map, currentPopupRef, focusedDeviceIdRef);
};

const setupDeviceLayerEvents = (map, currentPopupRef, focusedDeviceIdRef) => {
  // Cluster click - zoom in
  map.off("click", CLUSTER_LAYER_ID);
  map.on("click", CLUSTER_LAYER_ID, (event) => {
    const feature = event.features?.[0];
    if (!feature) return;

    const clusterId = feature.properties.cluster_id;
    const source = map.getSource(DEVICE_SOURCE_ID);

    if (!source || typeof clusterId === "undefined") return;

    source.getClusterExpansionZoom(clusterId, (err, zoom) => {
      if (err) return;
      map.easeTo({
        center: feature.geometry.coordinates,
        zoom,
        duration: 500,
      });
    });
  });

  const onUnclusteredClick = (event) => {
    const feature = event.features?.[0];
    if (feature) {
      const deviceId = feature.properties?.deviceId;
      openPopupFromFeature(map, feature, currentPopupRef, focusedDeviceIdRef, () => {
        setDeviceLabelVisibility(map, null);
      });

      if (deviceId) {
        setDeviceLabelVisibility(map, deviceId);
      }
      // Set the focused device ID
      if (focusedDeviceIdRef && deviceId) {
        focusedDeviceIdRef.current = Number(deviceId);
      }
    }
  };

  // Unclustered point click - show popup
  map.off("click", UNCLUSTERED_LAYER_ID);
  map.on("click", UNCLUSTERED_LAYER_ID, onUnclusteredClick);

  map.off("click", UNCLUSTERED_DIRECTION_LAYER_ID);
  map.on("click", UNCLUSTERED_DIRECTION_LAYER_ID, onUnclusteredClick);

  // Label click
  map.off("click", UNCLUSTERED_LABEL_LAYER_ID);
  map.on("click", UNCLUSTERED_LABEL_LAYER_ID, onUnclusteredClick);

  // Cursor pointer on hover
  map.off("mouseenter", CLUSTER_LAYER_ID);
  map.on("mouseenter", CLUSTER_LAYER_ID, () => {
    map.getCanvas().style.cursor = "pointer";
  });

  map.off("mouseleave", CLUSTER_LAYER_ID);
  map.on("mouseleave", CLUSTER_LAYER_ID, () => {
    map.getCanvas().style.cursor = "";
  });

  const onMouseEnter = () => {
    map.getCanvas().style.cursor = "pointer";
  };
  const onMouseLeave = () => {
    map.getCanvas().style.cursor = "";
  };

  map.off("mouseenter", UNCLUSTERED_LAYER_ID);
  map.on("mouseenter", UNCLUSTERED_LAYER_ID, onMouseEnter);

  map.off("mouseleave", UNCLUSTERED_LAYER_ID);
  map.on("mouseleave", UNCLUSTERED_LAYER_ID, onMouseLeave);

  map.off("mouseenter", UNCLUSTERED_DIRECTION_LAYER_ID);
  map.on("mouseenter", UNCLUSTERED_DIRECTION_LAYER_ID, onMouseEnter);

  map.off("mouseleave", UNCLUSTERED_DIRECTION_LAYER_ID);
  map.on("mouseleave", UNCLUSTERED_DIRECTION_LAYER_ID, onMouseLeave);

  map.off("mouseenter", UNCLUSTERED_LABEL_LAYER_ID);
  map.on("mouseenter", UNCLUSTERED_LABEL_LAYER_ID, onMouseEnter);

  map.off("mouseleave", UNCLUSTERED_LABEL_LAYER_ID);
  map.on("mouseleave", UNCLUSTERED_LABEL_LAYER_ID, onMouseLeave);
};

export const updateDeviceSourceData = (map, features, hasFitBounds) => {
  if (!map) return;

  const source = map.getSource(DEVICE_SOURCE_ID);
  if (!source) return;

  source.setData({
    type: "FeatureCollection",
    features,
  });

  // Fit bounds on first load
  if (!hasFitBounds.current && features.length > 0) {
    const bounds = new mapboxgl.LngLatBounds();
    features.forEach((feature) => bounds.extend(feature.geometry.coordinates));

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, {
        padding: FIT_BOUNDS_PADDING,
        maxZoom: FIT_BOUNDS_MAX_ZOOM,
        duration: 500,
      });
      hasFitBounds.current = true;
    }
  }
};

const ensureArrowImage = (map) => {
  if (map.hasImage("device-arrow")) return;

  const width = 24;
  const height = 24;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  // Draw arrow (pointing up)
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  // Simple triangle arrow
  ctx.moveTo(12, 4); // Top point
  ctx.lineTo(19, 20); // Bottom right
  ctx.lineTo(12, 17); // Inner bottom
  ctx.lineTo(5, 20); // Bottom left
  ctx.closePath();
  ctx.fill();

  const imageData = ctx.getImageData(0, 0, width, height);
  map.addImage("device-arrow", imageData, { sdf: true });
};
