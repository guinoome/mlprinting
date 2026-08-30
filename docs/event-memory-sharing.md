# Event Memory Sharing and Live Wall

Organizer-owned settings control enablement, mode, photo/video policy, and the opening and closing window. The published invitation exposes a dedicated guest link and QR target only when sharing is enabled.

Guest uploads are validated server-side, written to the private media bucket, and recorded as `PENDING`. The organizer moderation queue is ownership-scoped. Only `APPROVED` submissions can be served without an owner session, and only for a published event in `GUEST_GALLERY` or `LIVE_WALL` mode. Private and archive modes never expose media publicly. The live wall refreshes every 15 seconds with a browser-refresh fallback.
