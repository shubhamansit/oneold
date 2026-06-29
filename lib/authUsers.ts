export const EXISTING_USER_ROUTES: Record<string, string> = {
  "bhavnagar@gmail.com": "/jobsummary",
  "bmcswippr@gmail.com": "/worksummary",
  "osc@swm.com": "/summary",
};

export const DAYWISE_DISTANCE_USERS = [
  "nasikwaste123@gmail.com",
  "nmc123@gmail.com",
] as const;

export const DAYWISE_DISTANCE_ROUTE = "/daywisedistance";

export const HMC_USERS = ["hmc@gmail.com"] as const;

export const HMC_ROUTE = "/jobdetails";

export const HMC_WELCOME_ROUTE = "/welcome";

export function isDaywiseDistanceUser(email?: string | null) {
  return !!email && DAYWISE_DISTANCE_USERS.some((user) => user === email.toLowerCase());
}

export function isHmcUser(email?: string | null) {
  return !!email && HMC_USERS.some((user) => user === email.toLowerCase());
}

export function getLoginRedirectForEmail(email: string) {
  const normalizedEmail = email.toLowerCase();

  if (isDaywiseDistanceUser(normalizedEmail)) {
    return DAYWISE_DISTANCE_ROUTE;
  }

  if (isHmcUser(normalizedEmail)) {
    return HMC_WELCOME_ROUTE;
  }

  return EXISTING_USER_ROUTES[normalizedEmail] || "/";
}

export function canAccessRoute(email: string | null | undefined, pathname: string) {
  if (!email) return false;

  const normalizedEmail = email.toLowerCase();
  const isDaywiseRoute = pathname.startsWith(DAYWISE_DISTANCE_ROUTE);
  const isHmcRoute =
    pathname === HMC_WELCOME_ROUTE || pathname.startsWith(HMC_ROUTE);

  if (isDaywiseDistanceUser(normalizedEmail)) {
    return isDaywiseRoute;
  }

  if (isHmcUser(normalizedEmail)) {
    return isHmcRoute;
  }

  return (
    !isDaywiseRoute &&
    !isHmcRoute &&
    normalizedEmail in EXISTING_USER_ROUTES
  );
}
