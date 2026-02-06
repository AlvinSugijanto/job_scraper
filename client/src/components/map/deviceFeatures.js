export const buildDeviceFeatures = (devices, positions) => {
  const deviceMap = new Map(devices.map(device => [device.id, device]));
  const positionList = positions || [];
  const latestPositions = new Map();
  const totalDistances = new Map();

  positionList.forEach(position => {
    const deviceId = Number(position.deviceId);
    if (!Number.isFinite(deviceId) || latestPositions.has(deviceId)) return;
    latestPositions.set(deviceId, position);
    totalDistances.set(deviceId, Number(position.attributes?.totalDistance) || 0);
  });

  const features = [];
  latestPositions.forEach((position, deviceId) => {
    const device = deviceMap.get(deviceId);
    if (!device) return;

    const latitude = Number(position.latitude);
    const longitude = Number(position.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    const speedValue = Number(position.speed);
    const courseValue = Number(position.course);

    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      properties: {
        deviceId,
        name: device.name || 'Unknown device',
        status: device.status || 'unknown',
        speed: Number.isFinite(speedValue) ? speedValue : null,
        course: Number.isFinite(courseValue) ? courseValue : null,
        lastUpdate: device.lastUpdate || null,
        totalDistance: totalDistances.get(deviceId) || 0,
        latitude,
        longitude
      }
    });
  });

  return features;
};
