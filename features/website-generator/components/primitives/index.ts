/**
 * The invitation primitives — Increment 1 of docs/invitation-design-language.md.
 *
 * Shaped photo frames, the date row, corner decoration and the inset rule
 * frame, and the photo strip. None of them knows what occasion it is being
 * used for; the category layouts that come next are what supply that.
 */
export {
  PhotoFrame,
  type PhotoFrameProps,
  type PhotoShape,
} from "./photo-frame";
export {
  DateRow,
  splitDate,
  type DateRowProps,
  type DateParts,
} from "./date-row";
export {
  CornerOrnament,
  InsetFrame,
  type CornerOrnamentProps,
  type InsetFrameProps,
  type OrnamentMotif,
  type OrnamentPlacement,
} from "./ornament";
export { PhotoStrip, type PhotoStripProps } from "./photo-strip";
