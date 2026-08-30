# Original and Remaster Workflow

## Decision

An uploaded `MediaAsset` and its original storage object are immutable during
remastering. A remaster is a separate `MediaDerivative`, bound to the source
asset version and generated through the `RemasterProvider` interface.

`InvitationMedia.derivativeId` records the optional treatment selected for one
invitation slot. A null value means **Use Original**, which is the default.
Changing this value never overwrites or deletes the source image, so switching
between Original and Remaster is reversible.

## Integrity and access rules

- A derivative must belong to the assignment's asset, owner, and current source
  version before it can be saved.
- Generated paths contain the source version and a unique derivative id.
- Concurrent generation is idempotent for one asset version and provider
  version.
- Guest access requires the exact derivative to be referenced by a published
  invitation; ownership remains the dashboard access path.
- Replacing an asset clears derivatives of the replaced version after the new
  original is safely stored. Deleting an unused asset also removes its
  derivative objects.
- Website preview, published invitation, Open Graph image, and print generation
  all honor the selected current derivative and otherwise fall back to Original.

## Current provider

The first provider uses the existing Sharp dependency. It corrects orientation,
normalizes contrast, applies restrained sharpening, limits the longest edge to
2048 px without enlargement, and writes WebP. It is deterministic and local;
future providers can be introduced without changing the database or builder.
