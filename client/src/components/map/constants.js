import mapboxgl from "mapbox-gl";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export const DEVICE_SOURCE_ID = "traccar-device-source";
export const CLUSTER_LAYER_ID = "traccar-device-clusters";
export const CLUSTER_COUNT_LAYER_ID = "traccar-device-cluster-count";
export const UNCLUSTERED_LAYER_ID = "traccar-device-unclustered";
export const UNCLUSTERED_DIRECTION_LAYER_ID = "traccar-device-unclustered-direction";
export const UNCLUSTERED_LABEL_LAYER_ID = "traccar-device-unclustered-label";
export const GEOFENCES_SOURCE_ID = "geofences";
export const GEOFENCES_FILL_LAYER_ID = "geofences-fill";
export const GEOFENCES_OUTLINE_LAYER_ID = "geofences-outline";
export const GEOFENCE_LABELS_SOURCE_ID = "geofence-labels";
export const GEOFENCE_LABELS_LAYER_ID = "geofence-labels";
export const TRACKS_SOURCE_ID = "device-tracks";
export const TRACKS_LAYER_ID = "device-tracks-layer";
export const TRACK_HISTORY_SOURCE_ID = "device-track-history";
export const TRACK_HISTORY_LAYER_ID = "device-track-history-layer";
export const DEFAULT_CENTER = [106.8, -6.2];
export const DEFAULT_ZOOM = 2;
export const CLUSTER_RADIUS = 60;
export const CLUSTER_MAX_ZOOM = 14;
export const FIT_BOUNDS_PADDING = 60;
export const FIT_BOUNDS_MAX_ZOOM = 16;
