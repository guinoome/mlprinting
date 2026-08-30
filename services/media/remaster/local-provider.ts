import sharp from "sharp";
import type { RemasterProvider } from "./types";

const LONGEST_EDGE = 2048;

/**
 * Deterministic, dependency-free first provider. It corrects orientation,
 * balances contrast and applies restrained sharpening without enlarging or
 * inventing detail. A future provider can replace this behind the same seam.
 */
export const localRemasterProvider: RemasterProvider = {
  id: "local-sharp",
  version: "1",
  async remaster(input) {
    try {
      const pipeline = sharp(input)
        .rotate()
        .resize({
          width: LONGEST_EDGE,
          height: LONGEST_EDGE,
          fit: "inside",
          withoutEnlargement: true,
        })
        .normalize({ lower: 1, upper: 99 })
        .sharpen({ sigma: 0.7, m1: 0.5, m2: 1.5 })
        .webp({ quality: 90 });
      const { data, info } = await pipeline.toBuffer({
        resolveWithObject: true,
      });
      return {
        buffer: data,
        contentType: "image/webp",
        width: info.width,
        height: info.height,
      };
    } catch {
      return null;
    }
  },
};
