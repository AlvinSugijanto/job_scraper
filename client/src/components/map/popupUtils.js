import mapboxgl from "mapbox-gl";
import { reverseGeocode } from "@/utils/reverse-geocode";

export const createPopupHtml = (properties) => {
  const { name, status, speed, latitude, longitude, lastUpdate, totalDistance } = properties;

  const statusColor =
    status === "online"
      ? "#16a34a"
      : status === "offline"
        ? "#dc2626"
        : "#6b7280";

  const speedLine =
    typeof speed === "number"
      ? `<div style="display: flex; align-items: center; gap: 6px; font-size: 13px; color: #6b7280;">
         <span>Speed: ${(speed * 1.852).toFixed(2)} km/h</span>
       </div>`
      : "";

  const addressLine =
    Number.isFinite(latitude) && Number.isFinite(longitude)
      ? `<div style="display: flex; align-items: center; gap: 6px; font-size: 13px; color: #6b7280;">
         <span id="coordinates-${latitude}-${longitude}">
           <span>Address: </span>
           <a href="#" 
              onclick="handleShowAddress(event, ${latitude}, ${longitude})" 
              style="color: #3b82f6; text-decoration: underline; cursor: pointer;">
             show address
           </a>
         </span>
       </div>`
      : "";

  const updatedLine = lastUpdate
    ? `<div style="display: flex; align-items: center; gap: 6px; font-size: 13px; color: #6b7280;">
         <span>Updated: ${new Date(lastUpdate).toLocaleString()}</span>
       </div>`
    : "";

  const totalDistanceLine = totalDistance
    ? `<div style="display: flex; align-items: center; gap: 6px; font-size: 13px; color: #6b7280;">
         <span>Total Distance: ${(totalDistance / 1000).toFixed(2)} km</span>
       </div>`
    : "";

  return `
    <div id="popup-content" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 200px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb;">
        <div style="width: 8px; height: 8px; border-radius: 50%; background-color: ${statusColor};"></div>
        <div style="font-weight: 600; font-size: 14px; color: #111827;">${name}</div>
      </div>
      ${speedLine}
      ${addressLine}
      ${updatedLine}
      ${totalDistanceLine}
    </div>
  `;
};

export const updatePopupContent = (popup, properties) => {
  if (!popup) return;

  const newHtml = createPopupHtml(properties);
  popup.setHTML(newHtml);

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
};

export const openPopupFromFeature = (map, feature, currentPopupRef, focusedDeviceIdRef, onClose) => {
  if (!map) return;

  // Close existing popup
  if (currentPopupRef.current) {
    currentPopupRef.current.remove();
    currentPopupRef.current = null;
  }

  const coordinates = feature.geometry.coordinates.slice();
  const html = createPopupHtml(feature.properties);

  const popup = new mapboxgl.Popup({ offset: 25, closeButton: false })
    .setLngLat(coordinates)
    .setHTML(html)
    .addTo(map);

  popup.on('close', () => {
    if (focusedDeviceIdRef) {
      focusedDeviceIdRef.current = null;
    }
    currentPopupRef.current = null;
    if (onClose) onClose();
  });

  currentPopupRef.current = popup;

  // Attach the event handler to the window object so it can be called from the HTML
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
};

export const openPopupForDeviceId = (
  map,
  deviceId,
  deviceFeatures,
  currentPopupRef,
  focusedDeviceIdRef,
  onClose
) => {
  const normalizedId = Number(deviceId);
  const feature = deviceFeatures.find(
    (candidate) => Number(candidate.properties.deviceId) === normalizedId
  );

  if (feature) {
    openPopupFromFeature(map, feature, currentPopupRef, focusedDeviceIdRef, onClose);
  }
};

export const closePopup = (currentPopupRef) => {
  if (currentPopupRef.current) {
    currentPopupRef.current.remove();
    currentPopupRef.current = null;
  }

  // Clean up the global event handler
  if (window.handleShowAddress) {
    delete window.handleShowAddress;
  }
};
