# Security and privacy hardening

WP-13 closes the documented public-write and upload gaps without widening data collection.

## Public write limits

RSVP submissions are limited to 10 per invitation and connection per 10-minute window. Guest memory uploads are limited to 6. The limiter is database-backed so concurrent serverless instances share the same count. It stores only an HMAC digest of scope plus the edge-reported network address; raw addresses, user agents, cookies, and guest identities are not stored in limiter rows.

`RATE_LIMIT_SECRET` must contain at least 32 random characters. Public writes fail closed when it or the database is unavailable. Buckets expire and old rows are removed during later checks.

## Upload verification

The existing size, extension, and claimed MIME checks remain the first gate. The server now also verifies JPEG, PNG, WebP, HEIC, PDF, MP4, and WebM container signatures before storage. Authenticated media uploads enforce this in the shared storage service; privileged guest-memory uploads enforce it before the service-role write.

SVG remains rejected. Guest memories stay in the private media bucket, begin `PENDING`, and become publicly readable only when approved and the invitation's sharing mode permits a gallery or wall.

## Browser and ownership controls

All routes receive `nosniff`, clickjacking denial, strict referrer, restrictive camera/microphone/location permissions, and HSTS headers. Database reads and writes continue to scope ownership in their queries. Storage policies remain versioned in `docs/storage-policies.sql`; production policy application must be verified during release rather than inferred from code.
