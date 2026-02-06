export const reverseGeocode = async (latitude, longitude) => {
  try {
    const response = await fetch(
      `/api/proxy/traccar/server/geocode?latitude=${latitude}&longitude=${longitude}`
    );
    if (response.ok) {
      const address = await response.text();
      return address;
    }
    return null;
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return null;
  }
};
