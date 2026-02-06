export const convertDrawFeatureToTraccarArea = (feature) => {
  if (!feature || !feature.geometry) {
    throw new Error('Invalid feature');
  }

  const { type, coordinates } = feature.geometry;
  const { radius, center } = feature.properties || {};

  switch (type) {
    case 'LineString':
      return convertLineStringToTraccar(coordinates);
    case 'Polygon':
      if (radius && center) {
        return convertCircleToTraccar(center, radius);
      }
      return convertPolygonToTraccar(coordinates);
    default:
      throw new Error(`Unsupported geometry type: ${type}`);
  }
};

const convertCircleToTraccar = (center, radius) => {
  const [lng, lat] = center;

  return `CIRCLE (${lat} ${lng}, ${radius})`;
};

const convertLineStringToTraccar = (coordinates) => {
  const coordString = coordinates
    .map(([lng, lat]) => `${lat} ${lng}`)
    .join(', ');

  return `LINESTRING (${coordString})`;
};

const convertPolygonToTraccar = (coordinates) => {
  const outerRing = coordinates[0];
  const coordString = outerRing
    .map(([lng, lat]) => `${lat} ${lng}`)
    .join(', ');

  return `POLYGON ((${coordString}))`;
};
