/**
 * Tags used to describe how a `businesses` row came to exist / what the admin
 * still needs to fix. (The anonymous listing form that once wrote
 * `self-service` rows was retired in favour of partner signup + subscription;
 * the constants stay because older rows and the approval flow use them.)
 */

/** Row submitted through the old anonymous "list your business" form. */
export const SELF_SERVICE_TAG = 'self-service';
/** Geocoding failed; the pin is a country-level placeholder. */
export const NEEDS_GEOCODE_TAG = 'needs-geocode';
/** Only the town/area could be geocoded (pin is approximate). */
export const APPROX_LOCATION_TAG = 'approx-location';
