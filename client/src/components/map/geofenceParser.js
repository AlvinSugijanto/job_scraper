const parseCircle = (area) => {
  const match = area.match(/CIRCLE \(([-\d.]+) ([-\d.]+), ([\d.]+)\)/);
  if (!match) return null;

  const [, lat, lng, radius] = match;
  const center = [parseFloat(lng), parseFloat(lat)];
  const points = 64;
  const coords = [];
  const latCenter = parseFloat(lat);
  const radiusInDegreesLat = radius / 111320;
  const radiusInDegreesLng = radius / (111320 * Math.cos(latCenter * Math.PI / 180));

  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = radiusInDegreesLng * Math.cos(angle);
    const dy = radiusInDegreesLat * Math.sin(angle);
    coords.push([center[0] + dx, center[1] + dy]);
  }

  return {
    type: 'Polygon',
    coordinates: [coords],
    center: center
  };
};

const parsePolygon = (area) => {
  const coordString = area.match(/POLYGON \(\((.*?)\)\)/)?.[1];
  if (!coordString) return null;

  const coords = coordString.split(', ').map(pair => {
    const [lat, lng] = pair.split(' ').map(Number);
    return [lng, lat];
  });

  return {
    type: 'Polygon',
    coordinates: [coords]
  };
};

const parseLineString = (area) => {
  const coordString = area.match(/LINESTRING \((.*?)\)/)?.[1];
  if (!coordString) return null;

  const coords = coordString.split(', ').map(pair => {
    const [lat, lng] = pair.split(' ').map(Number);
    return [lng, lat];
  });

  let x = 0, y = 0;
  coords.forEach(coord => {
    x += coord[0];
    y += coord[1];
  });
  const center = [x / coords.length, y / coords.length];

  return {
    type: 'LineString',
    coordinates: coords,
    center: center
  };
};

export const parseGeofence = (area) => {
  if (area.startsWith('CIRCLE')) {
    return parseCircle(area);
  } else if (area.startsWith('POLYGON')) {
    return parsePolygon(area);
  } else if (area.startsWith('LINESTRING')) {
    return parseLineString(area);
  }
  return null;
};
