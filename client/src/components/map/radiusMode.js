// Referensi dari https://gist.github.com/chriswhong/694779bc1f1e5d926e47bab7205fa559

import * as turf from '@turf/turf';

const RadiusMode = {};

// Setup when mode is activated
RadiusMode.onSetup = function(opts) {
  const state = {
    line: this.newFeature({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: []
      }
    }),
    currentVertexPosition: 0
  };

  this.addFeature(state.line);
  this.clearSelectedFeatures();
  this.updateUIClasses({ mouse: 'add' });
  this.activateUIButton();

  // Disable double click zoom
  this.setActionableState({
    trash: false,
    combineFeatures: false,
    uncombineFeatures: false
  });

  return state;
};

// First click: set center point
// Second click: confirm radius and finish
RadiusMode.onClick = function(state, e) {
  // First click: set center point
  if (state.currentVertexPosition === 0) {
    state.line.updateCoordinate(0, e.lngLat.lng, e.lngLat.lat);
    state.currentVertexPosition = 1;
    state.line.updateCoordinate(1, e.lngLat.lng, e.lngLat.lat);
    return null;
  }

  // Second click: confirm radius and finish
  if (state.currentVertexPosition === 1) {
    state.line.updateCoordinate(1, e.lngLat.lng, e.lngLat.lat);
    return this.changeMode('simple_select', { featureIds: [state.line.id] });
  }

  return null;
};

// Update the radius point dynamically as mouse moves
RadiusMode.onMouseMove = function(state, e) {
  if (state.currentVertexPosition === 1) {
    state.line.updateCoordinate(1, e.lngLat.lng, e.lngLat.lat);
  }
};

// Handle keyboard events
RadiusMode.onKeyUp = function(state, e) {
  if (e.keyCode === 27) { // Escape key
    this.deleteFeature([state.line.id], { silent: true });
    this.changeMode('simple_select');
  }
};

// Create the final geojson circle feature when done
RadiusMode.onStop = function(state) {
  this.updateUIClasses({ mouse: 'none' });
  this.activateUIButton();

  document
    .querySelectorAll(".mapbox-gl-draw_ctrl-draw-btn")
    .forEach(btn => btn.classList.remove("active"));

  // Re-enable double click zoom
  if (this.map && this.map.doubleClickZoom) {
    setTimeout(() => {
      if (
        !this.map ||
        !this.map.doubleClickZoom ||
        !this._ctx ||
        !this._ctx.store ||
        !this._ctx.store.getInitialConfigValue
      ) return;

      if (!this._ctx.store.getInitialConfigValue('doubleClickZoom')) return;
      this.map.doubleClickZoom.enable();
    }, 0);
  }

  // Check if feature was deleted
  if (this.getFeature(state.line.id) === undefined) return;

  // Create circle if we have both points
  if (state.line.coordinates.length > 1) {
    const lineGeoJson = state.line.toGeoJSON();
    const center = lineGeoJson.geometry.coordinates[0];
    const radiusPoint = lineGeoJson.geometry.coordinates[1];

    // Calculate radius in meters using Turf
    const from = turf.point(center);
    const to = turf.point(radiusPoint);
    const radiusInMeters = turf.distance(from, to, { units: 'meters' });

    // Create a circle feature
    const options = { steps: 64, units: 'meters' };
    const circle = turf.circle(center, radiusInMeters, options);

    const circleFeature = {
      type: 'Feature',
      geometry: circle.geometry,
      properties: {
        radius: radiusInMeters,
        center: center
      }
    };

    this.deleteFeature([state.line.id], { silent: true });
    this.map.fire('draw.create', {
      features: [circleFeature]
    });
  } else {
    this.deleteFeature([state.line.id], { silent: true });
    this.changeMode('simple_select', {}, { silent: true });
  }
};

// Display features during drawing
RadiusMode.toDisplayFeatures = function(state, geojson, display) {
  const isActiveLine = geojson.properties.id === state.line.id;
  geojson.properties.active = isActiveLine ? 'true' : 'false';

  if (!isActiveLine) return display(geojson);

  // Only render if we have at least the center point
  if (geojson.geometry.coordinates.length < 2) return null;

  const center = geojson.geometry.coordinates[0];
  const radiusPoint = geojson.geometry.coordinates[1];

  // Display center vertex
  display({
    type: 'Feature',
    properties: {
      meta: 'vertex',
      parent: state.line.id,
      coord_path: '0',
      active: 'false'
    },
    geometry: {
      type: 'Point',
      coordinates: center
    }
  });

  // Calculate radius
  const from = turf.point(center);
  const to = turf.point(radiusPoint);
  const radiusInMeters = turf.distance(from, to, { units: 'meters' });

  // Display radius line
  display(geojson);

  // Get display measurements
  let metricUnits = 'm';
  let metricMeasurement = radiusInMeters;
  if (radiusInMeters >= 1000) {
    metricMeasurement = radiusInMeters / 1000;
    metricUnits = 'km';
  }

  // Display current radius point with measurements
  const currentVertex = {
    type: 'Feature',
    properties: {
      meta: 'currentPosition',
      radiusMetric: `${metricMeasurement.toFixed(2)} ${metricUnits}`,
      parent: state.line.id
    },
    geometry: {
      type: 'Point',
      coordinates: radiusPoint
    }
  };
  display(currentVertex);

  // Display circle preview
  const options = { steps: 64, units: 'meters' };
  const circle = turf.circle(center, radiusInMeters, options);

  const circleFeature = {
    type: 'Feature',
    geometry: circle.geometry,
    properties: {
      parent: state.line.id,
      meta: 'radius'
    }
  };
  display(circleFeature);

  return null;
};

// Handle trash action
RadiusMode.onTrash = function(state) {
  this.deleteFeature([state.line.id], { silent: true });
  this.changeMode('simple_select');
};

export default RadiusMode;
