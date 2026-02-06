import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTheme } from "next-themes";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  GEOFENCES_FILL_LAYER_ID,
  GEOFENCES_OUTLINE_LAYER_ID,
  GEOFENCE_LABELS_LAYER_ID,
} from "./constants";
import { addGeofenceLayers, updateGeofenceData } from "./geofenceLayers";
import { buildDeviceFeatures } from "./deviceFeatures";
import { addDeviceLayers, updateDeviceSourceData, setDeviceLabelVisibility } from "./deviceLayers";
import {
  openPopupForDeviceId,
  closePopup,
  updatePopupContent,
} from "./popupUtils";
import { convertDrawFeatureToTraccarArea } from "./drawUtils";
import { parseGeofence } from "./geofenceParser";
import GeofenceNameDialog from "./geofence-name-dialog";
import RadiusMode from "./radiusMode";
import { ExtendedMapboxDraw } from "./ExtendedMapboxDraw";
import { addTrackLayers, updateTrackData } from "./trackLayers";
import {
  addTrackLayerHistory,
  clearTrackHistory,
  updateTrackDataHistory,
} from "./trackLayerHistory";

const TraccarMap = ({
  devices,
  positions,
  geofences,
  mapRef: externalMapRef,
  selectedDeviceId,
  selectedTrackDetail,
  tracks: tracksData,
  isSelectingEvent,
}) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const drawRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const geofencesRef = useRef(geofences);
  const latestDevicesRef = useRef(devices);
  const latestPositionsRef = useRef(positions);
  const latestDeviceFeaturesRef = useRef([]);
  const tracksRef = useRef(tracksData);
  const trackHistoryRef = useRef(selectedTrackDetail);
  const hasFitBounds = useRef(false);
  const currentPopupRef = useRef(null);
  const focusedDeviceIdRef = useRef(null);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [pendingFeature, setPendingFeature] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedGeofence, setSelectedGeofence] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [geofenceToDelete, setGeofenceToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    geofencesRef.current = geofences;
  }, [geofences]);

  useEffect(() => {
    latestDevicesRef.current = devices;
  }, [devices]);

  useEffect(() => {
    latestPositionsRef.current = positions;
  }, [positions]);

  useEffect(() => {
    tracksRef.current = tracksData;
  }, [tracksData]);

  useEffect(() => {
    trackHistoryRef.current = selectedTrackDetail;
  }, [selectedTrackDetail]);

  useEffect(() => {
    if (externalMapRef && mapRef.current) {
      externalMapRef.current = mapRef.current;
    }
  }, [externalMapRef, mapRef.current]);

  const updateDeviceData = () => {
    const map = mapRef.current;
    if (!map) return;

    const features = buildDeviceFeatures(
      latestDevicesRef.current,
      latestPositionsRef.current
    );

    latestDeviceFeaturesRef.current = features;
    updateDeviceSourceData(map, features, hasFitBounds);

    // Update popup if there's a focused device
    if (focusedDeviceIdRef.current && currentPopupRef.current) {
      const focusedFeature = features.find(
        (f) =>
          Number(f.properties.deviceId) === Number(focusedDeviceIdRef.current)
      );

      if (focusedFeature) {
        const newCoords = focusedFeature.geometry.coordinates;

        currentPopupRef.current.setLngLat(newCoords);
        updatePopupContent(currentPopupRef.current, focusedFeature.properties);

        // Move camera to follow the device smoothly
        map.flyTo({
          center: newCoords,
          duration: 1000,
          essential: true,
        });
      }
    }
  };

  const handleGeofenceCreate = async (name) => {
    if (!pendingFeature || !name.trim()) return;

    try {
      const traccarArea = convertDrawFeatureToTraccarArea(pendingFeature);

      const response = await fetch("/api/proxy/traccar/geofences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          area: traccarArea,
        }),
      });

      if (response.ok) {
        const newGeofence = await response.json();

        // Update geofences immediately in the map
        if (mapRef.current && mapLoaded) {
          const updatedGeofences = [...geofencesRef.current, newGeofence];
          geofencesRef.current = updatedGeofences;
          updateGeofenceData(mapRef.current, updatedGeofences);
        }

        // Clear the drawing
        if (drawRef.current) {
          drawRef.current.deleteAll();
        }
      } else {
        const error = await response.text();
        console.error("Failed to create geofence:", error);
        alert("Failed to create geofence: " + error);
      }
    } catch (error) {
      console.error("Error creating geofence:", error);
      alert("Error creating geofence: " + error.message);
    } finally {
      setPendingFeature(null);
      setShowNameDialog(false);
    }
  };

  const applyGeofenceChanges = async () => {
    if (!drawRef.current || !selectedGeofence) return;

    const features = drawRef.current.getAll();
    if (features.features.length === 0) return;

    const feature = features.features[0];

    setIsUpdating(true);

    try {
      const traccarArea = convertDrawFeatureToTraccarArea(feature);
      const response = await fetch(
        `/api/proxy/traccar/geofences/${selectedGeofence.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...selectedGeofence,
            area: traccarArea,
          }),
        }
      );

      if (response.ok) {
        const updatedGeofence = await response.json();
        if (mapRef.current && mapLoaded) {
          const updatedGeofences = geofencesRef.current.map((g) =>
            g.id === updatedGeofence.id ? updatedGeofence : g
          );
          geofencesRef.current = updatedGeofences;
          updateGeofenceData(mapRef.current, updatedGeofences);
        }

        drawRef.current.deleteAll();
        setSelectedGeofence(null);
      } else {
        const error = await response.text();
        console.error("Failed to update geofence:", error);
        alert("Failed to update geofence: " + error);
      }
    } catch (error) {
      console.error("Error updating geofence:", error);
      alert("Error updating geofence: " + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleGeofenceDelete = async () => {
    if (!geofenceToDelete) return;

    setIsDeleting(true);

    try {
      const response = await fetch(
        `/api/proxy/traccar/geofences/${geofenceToDelete.id}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        if (mapRef.current && mapLoaded) {
          const updatedGeofences = geofencesRef.current.filter(
            (g) => g.id !== geofenceToDelete.id
          );
          geofencesRef.current = updatedGeofences;
          updateGeofenceData(mapRef.current, updatedGeofences);
        }
        if (drawRef.current) {
          drawRef.current.deleteAll();
        }
        setSelectedGeofence(null);
      } else {
        const error = await response.text();
        console.error("Failed to delete geofence:", error);
        alert("Failed to delete geofence: " + error);
      }
    } catch (error) {
      console.error("Error deleting geofence:", error);
      alert("Error deleting geofence: " + error.message);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setGeofenceToDelete(null);
    }
  };

  const openDeleteDialog = (geofence) => {
    setGeofenceToDelete(geofence);
    setShowDeleteDialog(true);
  };

  const toggleEditMode = () => {
    if (!drawRef.current || !mapRef.current) return;

    setEditMode((prevEditMode) => {
      if (prevEditMode) {
        drawRef.current.deleteAll();
        setSelectedGeofence(null);
        updateGeofenceData(mapRef.current, geofencesRef.current);
        return false;
      } else {
        drawRef.current.changeMode("simple_select");
        return true;
      }
    });
  };

  const loadGeofenceForEditing = (geofence) => {
    if (!drawRef.current || !mapRef.current) return;

    const geometryData = parseGeofence(geofence.area);
    if (!geometryData) {
      console.error("Failed to parse geofence geometry");
      return;
    }

    drawRef.current.deleteAll();

    // hapus geofence yang lagi diedit biar gak duplikat
    const filteredGeofences = geofencesRef.current.filter(
      (g) => g.id !== geofence.id
    );
    updateGeofenceData(mapRef.current, filteredGeofences);

    const feature = {
      type: "Feature",
      properties: {
        id: geofence.id,
      },
      geometry: {
        type: geometryData.type,
        coordinates: geometryData.coordinates,
      },
    };

    const featureIds = drawRef.current.add(feature);

    if (featureIds && featureIds.length > 0) {
      drawRef.current.changeMode("direct_select", {
        featureId: featureIds[0],
      });

      setSelectedGeofence(geofence);

      // Zoom to the geofence
      const bounds = new mapboxgl.LngLatBounds();
      if (geometryData.type === "Polygon") {
        geometryData.coordinates[0].forEach((coord) => bounds.extend(coord));
      } else if (geometryData.type === "LineString") {
        geometryData.coordinates.forEach((coord) => bounds.extend(coord));
      }

      if (!bounds.isEmpty()) {
        mapRef.current.fitBounds(bounds, {
          padding: 100,
          duration: 1000,
        });
      }
    }
  };

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: isDark
        ? "mapbox://styles/mapbox/dark-v11"
        : "mapbox://styles/mapbox/light-v11",
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    mapRef.current = map;

    const draw = new ExtendedMapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        line_string: true,
        trash: true,
      },
      modes: {
        ...ExtendedMapboxDraw.modes,
        draw_radius: RadiusMode,
      },
      styles: [
        {
          id: "gl-draw-polygon-fill",
          type: "fill",
          filter: ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
          paint: {
            "fill-color": "#3b82f6",
            "fill-outline-color": "#3b82f6",
            "fill-opacity": 0.3,
          },
        },
        {
          id: "gl-draw-polygon-stroke-active",
          type: "line",
          filter: ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
          paint: {
            "line-color": "#3b82f6",
            "line-width": 2,
          },
        },
        {
          id: "gl-draw-line",
          type: "line",
          filter: [
            "all",
            ["==", "$type", "LineString"],
            ["!=", "mode", "static"],
          ],
          paint: {
            "line-color": "#3b82f6",
            "line-width": 2,
          },
        },
        {
          id: "gl-draw-point",
          type: "circle",
          filter: ["all", ["==", "$type", "Point"], ["!=", "mode", "static"]],
          paint: {
            "circle-radius": 6,
            "circle-color": "#3b82f6",
          },
        },
        {
          id: "gl-draw-polygon-and-line-vertex-active",
          type: "circle",
          filter: ["all", ["==", "meta", "vertex"], ["==", "$type", "Point"]],
          paint: {
            "circle-radius": 5,
            "circle-color": "#ffffff",
            "circle-stroke-color": "#3b82f6",
            "circle-stroke-width": 2,
          },
        },
      ],
      customButtons: [
        {
          title: "Circle tool",
          svg: "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='3'%3E%3Ccircle cx='12' cy='12' r='8'/%3E%3C/svg%3E",
          position: 0,
          action: (drawInstance) => {
            drawInstance.changeMode("draw_radius");
          },
        },
        {
          title: "Edit geofences",
          svg:
            "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2'%3E%3Cpath d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/%3E%3Cpath d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'/%3E%3C/svg%3E",
          position: 3,
          action: () => {
            toggleEditMode();
          },
        },
      ],
    });

    drawRef.current = draw;
    map.addControl(draw, "top-left");

    map.on("draw.create", (e) => {
      const feature = e.features[0];
      setPendingFeature(feature);
      setShowNameDialog(true);
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.addControl(new mapboxgl.FullscreenControl(), "top-right");

    map.removeControl(
      map._controls.find((c) => c instanceof mapboxgl.AttributionControl)
    );
    map.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-right"
    );

    map.on("load", () => {
      addGeofenceLayers(map, isDark);
      updateGeofenceData(map, geofencesRef.current);
      addDeviceLayers(map, isDark, currentPopupRef, focusedDeviceIdRef);
      updateDeviceData();
      addTrackLayers(map, isDark);
      updateTrackData(map, tracksRef.current);
      addTrackLayerHistory(map);
      updateTrackDataHistory(map, trackHistoryRef.current, currentPopupRef);
      setMapLoaded(true);
    });

    return () => {
      closePopup(currentPopupRef);
      focusedDeviceIdRef.current = null;
      if (drawRef.current && mapRef.current) {
        mapRef.current.removeControl(drawRef.current);
        drawRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!drawRef.current) return;

    const container = drawRef.current._container;
    if (!container) return;

    const editButton = container.querySelector('[title="Edit geofences"]');
    if (editButton) {
      if (editMode) {
        editButton.classList.add('active');
      } else {
        editButton.classList.remove('active');
      }
    }
  }, [editMode]);

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    const handleGeofenceClick = (e) => {
      if (!editMode) return;

      const features = mapRef.current.queryRenderedFeatures(e.point, {
        layers: [
          GEOFENCES_FILL_LAYER_ID,
          GEOFENCES_OUTLINE_LAYER_ID,
          GEOFENCE_LABELS_LAYER_ID,
        ],
      });

      if (features.length > 0) {
        const geofenceId = features[0].properties.id;
        const geofence = geofencesRef.current.find((g) => g.id === geofenceId);

        if (geofence) {
          loadGeofenceForEditing(geofence);
        }
      }
    };

    const handleMouseEnter = () => {
      if (!editMode) return;
      mapRef.current.getCanvas().style.cursor = "pointer";
    };

    const handleMouseLeave = (e) => {
      if (!editMode) return;
      const features = mapRef.current.queryRenderedFeatures(e.point, {
        layers: [
          GEOFENCES_FILL_LAYER_ID,
          GEOFENCES_OUTLINE_LAYER_ID,
          GEOFENCE_LABELS_LAYER_ID,
        ],
      });
      if (features.length === 0) {
        mapRef.current.getCanvas().style.cursor = "";
      }
    };

    mapRef.current.on("click", handleGeofenceClick);
    mapRef.current.on("mouseenter", GEOFENCES_FILL_LAYER_ID, handleMouseEnter);
    mapRef.current.on("mouseleave", GEOFENCES_FILL_LAYER_ID, handleMouseLeave);
    mapRef.current.on("mouseenter", GEOFENCES_OUTLINE_LAYER_ID, handleMouseEnter);
    mapRef.current.on("mouseleave", GEOFENCES_OUTLINE_LAYER_ID, handleMouseLeave);
    mapRef.current.on("mouseenter", GEOFENCE_LABELS_LAYER_ID, handleMouseEnter);
    mapRef.current.on("mouseleave", GEOFENCE_LABELS_LAYER_ID, handleMouseLeave);

    return () => {
      if (mapRef.current) {
        mapRef.current.off("click", handleGeofenceClick);
        mapRef.current.off("mouseenter", GEOFENCES_FILL_LAYER_ID, handleMouseEnter);
        mapRef.current.off("mouseleave", GEOFENCES_FILL_LAYER_ID, handleMouseLeave);
        mapRef.current.off("mouseenter", GEOFENCES_OUTLINE_LAYER_ID, handleMouseEnter);
        mapRef.current.off("mouseleave", GEOFENCES_OUTLINE_LAYER_ID, handleMouseLeave);
        mapRef.current.off("mouseenter", GEOFENCE_LABELS_LAYER_ID, handleMouseEnter);
        mapRef.current.off("mouseleave", GEOFENCE_LABELS_LAYER_ID, handleMouseLeave);
      }
    };
  }, [editMode, mapLoaded]);

  // Update map style when theme changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    const newStyle = isDark
      ? "mapbox://styles/mapbox/dark-v11"
      : "mapbox://styles/mapbox/light-v11";
    closePopup(currentPopupRef);
    focusedDeviceIdRef.current = null;

    mapRef.current.setStyle(newStyle);

    mapRef.current.once("style.load", () => {
      addGeofenceLayers(mapRef.current, isDark);
      updateGeofenceData(mapRef.current, geofencesRef.current);

      if (mapRef.current.getLayer(GEOFENCE_LABELS_LAYER_ID)) {
        mapRef.current.setPaintProperty(
          GEOFENCE_LABELS_LAYER_ID,
          "text-halo-color",
          isDark ? "#1f2937" : "#ffffff"
        );
      }

      addDeviceLayers(
        mapRef.current,
        isDark,
        currentPopupRef,
        focusedDeviceIdRef
      );
      updateDeviceData();
      addTrackLayers(mapRef.current, isDark);
      updateTrackData(mapRef.current, tracksRef.current);
      addTrackLayerHistory(mapRef.current);
      updateTrackDataHistory(
        mapRef.current,
        trackHistoryRef.current,
        currentPopupRef
      );
    });
  }, [isDark]);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !geofences) return;
    updateGeofenceData(mapRef.current, geofences);
  }, [geofences, mapLoaded]);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || isSelectingEvent) return;

    updateDeviceData();
  }, [devices, positions, mapLoaded]);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    updateTrackData(mapRef.current, tracksRef.current);
  }, [tracksData, mapLoaded]);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !selectedTrackDetail) {
      clearTrackHistory(mapRef.current);
      closePopup(currentPopupRef);
      return;
    }

    updateTrackDataHistory(
      mapRef.current,
      trackHistoryRef.current,
      currentPopupRef
    );
  }, [selectedTrackDetail, mapLoaded]);

  useEffect(() => {
    if (!selectedDeviceId || !mapRef.current || !mapLoaded) return;

    const deviceId = selectedDeviceId;
    const feature = latestDeviceFeaturesRef.current.find(
      (candidate) => Number(candidate.properties.deviceId) === Number(deviceId)
    );

    if (!feature) return;

    closePopup(currentPopupRef);
    focusedDeviceIdRef.current = deviceId;
    setDeviceLabelVisibility(mapRef.current, deviceId);

    mapRef.current.flyTo({
      center: feature.geometry.coordinates,
      zoom: 18,
      duration: 1500,
      essential: true,
    });

    setTimeout(() => {
      if (mapRef.current && deviceId === selectedDeviceId) {
        openPopupForDeviceId(
          mapRef.current,
          deviceId,
          latestDeviceFeaturesRef.current,
          currentPopupRef,
          focusedDeviceIdRef,
          () => setDeviceLabelVisibility(mapRef.current, null)
        );
      }
    }, 1600);
  }, [selectedDeviceId, mapLoaded]);

  return (
    <>
      <div ref={mapContainerRef} className="w-full h-full" />
      {editMode && selectedGeofence && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 p-2 rounded-md shadow-[0_0_0_2px_rgba(0,0,0,0.1)] z-10 flex items-center gap-2">
          <span className="text-xs font-medium pr-2 text-gray-900 dark:text-gray-100">
            {selectedGeofence.name}
          </span>
          <button
            onClick={applyGeofenceChanges}
            disabled={isUpdating || isDeleting}
            className="px-2 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <p>Apply</p>}
          </button>
          <button
            onClick={() => openDeleteDialog(selectedGeofence)}
            disabled={isUpdating || isDeleting}
            className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <p>Delete</p>}
          </button>
          <button
            onClick={() => {
              drawRef.current.deleteAll();
              setSelectedGeofence(null);
              updateGeofenceData(mapRef.current, geofencesRef.current);
            }}
            disabled={isUpdating || isDeleting}
            className="px-2 py-1 text-xs bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      )}
      <GeofenceNameDialog
        open={showNameDialog}
        onOpenChange={(open) => {
          setShowNameDialog(open);
          if (!open && pendingFeature && drawRef.current) {
            drawRef.current.deleteAll();
            setPendingFeature(null);
          }
        }}
        onSubmit={handleGeofenceCreate}
      />
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Geofence</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{geofenceToDelete?.name}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleGeofenceDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <p>Delete</p>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TraccarMap;
