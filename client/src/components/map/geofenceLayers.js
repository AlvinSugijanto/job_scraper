import {
  GEOFENCES_SOURCE_ID,
  GEOFENCES_FILL_LAYER_ID,
  GEOFENCES_OUTLINE_LAYER_ID,
  GEOFENCE_LABELS_SOURCE_ID,
  GEOFENCE_LABELS_LAYER_ID
} from './constants';
import { parseGeofence } from './geofenceParser';
import * as turf from '@turf/turf';

export const addGeofenceLayers = (map, isDark) => {
  if (!map.getSource(GEOFENCES_SOURCE_ID)) {
    map.addSource(GEOFENCES_SOURCE_ID, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    });

    map.addLayer({
      id: GEOFENCES_FILL_LAYER_ID,
      type: 'fill',
      source: GEOFENCES_SOURCE_ID,
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: {
        'fill-color': '#3b82f6',
        'fill-opacity': 0.2
      }
    });

    map.addLayer({
      id: GEOFENCES_OUTLINE_LAYER_ID,
      type: 'line',
      source: GEOFENCES_SOURCE_ID,
      paint: {
        'line-color': '#3b82f6',
        'line-width': 2
      }
    });
  }

  if (!map.getSource(GEOFENCE_LABELS_SOURCE_ID)) {
    map.addSource(GEOFENCE_LABELS_SOURCE_ID, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    });

    map.addLayer({
      id: GEOFENCE_LABELS_LAYER_ID,
      type: 'symbol',
      source: GEOFENCE_LABELS_SOURCE_ID,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 12,
        'text-anchor': 'center',
        'text-allow-overlap': false,
        'text-ignore-placement': false
      },
      paint: {
        'text-color': '#3b82f6',
        'text-halo-color': isDark ? '#1f2937' : '#ffffff',
        'text-halo-width': 2,
        'text-halo-blur': 1
      }
    });
  }
};

export const updateGeofenceData = (map, geofencesData) => {
  if (!geofencesData) return;

  const features = [];
  const labelFeatures = [];

  geofencesData.forEach(geofence => {
    const geometryData = parseGeofence(geofence.area);
    if (!geometryData) return;

    features.push({
      type: 'Feature',
      properties: {
        id: geofence.id,
        name: geofence.name,
        description: geofence.description
      },
      geometry: {
        type: geometryData.type,
        coordinates: geometryData.coordinates
      }
    });

    const center = geometryData.center || turf.centroid({
      type: 'Feature',
      geometry: {
        type: geometryData.type,
        coordinates: geometryData.coordinates
      }
    }).geometry.coordinates;

    labelFeatures.push({
      type: 'Feature',
      properties: {
        id: geofence.id,
        name: geofence.name
      },
      geometry: {
        type: 'Point',
        coordinates: center
      }
    });
  });

  const source = map.getSource(GEOFENCES_SOURCE_ID);
  if (source) {
    source.setData({
      type: 'FeatureCollection',
      features
    });
  }

  const labelSource = map.getSource(GEOFENCE_LABELS_SOURCE_ID);
  if (labelSource) {
    labelSource.setData({
      type: 'FeatureCollection',
      features: labelFeatures
    });
  }
};
