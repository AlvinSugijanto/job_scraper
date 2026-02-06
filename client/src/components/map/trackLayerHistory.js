import { TRACK_HISTORY_SOURCE_ID, TRACK_HISTORY_LAYER_ID } from "./constants";
import mapboxgl from "mapbox-gl";
import {
  closePopup,
  createPopupHtml,
  openPopupForDeviceId,
} from "./popupUtils";
import { reverseGeocode } from "@/utils/reverse-geocode";

export const addTrackLayerHistory = (map) => {
  if (!map.getSource(TRACK_HISTORY_SOURCE_ID)) {
    map.addSource(TRACK_HISTORY_SOURCE_ID, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [],
      },
    });

    map.addLayer({
      id: TRACK_HISTORY_LAYER_ID,
      type: "circle",
      source: TRACK_HISTORY_SOURCE_ID,
      paint: {
        "circle-radius": 6,
        "circle-color": "#f97316",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
      },
    });
  }
};

export const updateTrackDataHistory = (
  map,
  selectedTrackDetail,
  currentPopupRef
) => {
  if (!map || !selectedTrackDetail) return;

  closePopup(currentPopupRef);

  const { latitude, longitude, deviceId, id, date, speed, deviceName } =
    selectedTrackDetail;

  const source = map.getSource(TRACK_HISTORY_SOURCE_ID);
  if (!source) return;

  const transformData = {
    name: deviceName || "Unknown Device",
    status: "history", // placeholder
    speed: speed,
    latitude: latitude,
    longitude: longitude,
    lastUpdate: date, // gunakan date track
  };

  // GeoJSON Feature for the selected track point
  const pointFeature = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        properties: transformData,
      },
    ],
  };

  // update source with new data
  source.setData(pointFeature);

  // Move map to the selected track point
  map.flyTo({
    center: [longitude, latitude],
    zoom: 17.5,
    duration: 1500,
    essential: true,
  });

  // create popup content
  const popupHtml = createPopupHtml(transformData);

  // Re-attach the event handler
  window.handleShowAddress = async (event, latitude, longitude) => {
    event.preventDefault();
    const linkElement = document.getElementById(
      `coordinates-${latitude}-${longitude}`
    );
    if (!linkElement) return;

    linkElement.innerHTML =
      '<span style="color: #6b7280;">Address: Loading...</span>';

    const address = await reverseGeocode(latitude, longitude);

    if (address) {
      linkElement.innerHTML = `<span style="color: #6b7280;">Address: ${address}</span>`;
    } else {
      linkElement.innerHTML = `<span style="color: #6b7280;">Address: ${latitude.toFixed(
        5
      )}, ${longitude.toFixed(5)}</span>`;
    }
  };

  const popup = new mapboxgl.Popup({
    offset: 25,
    closeButton: false,
  })
    .setLngLat([longitude, latitude])
    .setHTML(popupHtml)
    .addTo(map);

  currentPopupRef.current = popup;
};

export const clearTrackHistory = (map) => {
  const source = map.getSource(TRACK_HISTORY_SOURCE_ID);
  if (!source) return;

  source.setData({
    type: "FeatureCollection",
    features: [],
  });
};
