/**
 * Shared job ↔ monthly-vehicle matching (keep in sync with append*ZoneData scripts).
 * Returns true if this zone job name should receive rows for this monthly template Vehicle string.
 */
function jobMatchesMonthlyVehicle(jobName, monthlyVehicle) {
  if (!jobName || !monthlyVehicle) return false;

  const routeMatch = jobName.match(/(\d{2}-\d{2}-\d{4})/);
  if (routeMatch) {
    const routeCode = routeMatch[1];
    if (monthlyVehicle.includes(routeCode)) return true;
    const routeParts = routeCode.split('-');
    const last4 = routeParts[2];
    const firstPart = `${routeParts[0]}-${routeParts[1]}`;
    if (monthlyVehicle.includes(last4) && monthlyVehicle.includes(firstPart)) return true;
  }

  const specialRouteMatch = jobName.match(/([WE]-\d+-\d{4})/);
  if (specialRouteMatch) {
    const specialRoute = specialRouteMatch[1];
    const routeParts = specialRoute.split('-');
    const vehicleNum = routeParts[2];
    const routePrefix = `${routeParts[0]}-${routeParts[1]}`;
    if (monthlyVehicle.includes(vehicleNum) && monthlyVehicle.includes(routePrefix)) return true;
  }

  if (routeMatch) {
    const routeCode = routeMatch[1];
    const routeParts = routeCode.split('-');
    const last4 = routeParts[2];
    const normalizedRoute = routeCode.replace(/-/g, '');
    const normalizedMonthly = monthlyVehicle.replace(/[-\s]/g, '');
    if (
      monthlyVehicle.includes(routeCode) ||
      normalizedMonthly.includes(normalizedRoute) ||
      monthlyVehicle.includes(last4)
    ) {
      return true;
    }
  }

  const routeFormatMatch = jobName.match(/ROUTE\s+(\d{2}-\d{2})/);
  if (routeFormatMatch) {
    const routePrefix = routeFormatMatch[1];
    if (monthlyVehicle.includes(`ROUTE ${routePrefix}`) || monthlyVehicle.includes(routePrefix)) {
      const vehicleNumMatch = jobName.match(/(\d{4})/);
      if (vehicleNumMatch && monthlyVehicle.includes(vehicleNumMatch[1])) return true;
    }
  }

  const vehicleNumberMatch = jobName.match(/(\d{2}-\d{2}-\d{4})/);
  if (vehicleNumberMatch) {
    const vehicleNumber = vehicleNumberMatch[1];
    const normalizedVehicle = vehicleNumber.replace(/-/g, '');
    const normalizedMonthly = monthlyVehicle.replace(/[-\s]/g, '');
    if (
      normalizedMonthly.includes(normalizedVehicle) ||
      monthlyVehicle.includes(vehicleNumber)
    ) {
      return true;
    }
  }

  return false;
}

module.exports = { jobMatchesMonthlyVehicle };
