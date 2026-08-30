export interface RemasterOutput {
  buffer: Buffer;
  contentType: "image/webp";
  width: number;
  height: number;
}

export interface RemasterProvider {
  readonly id: string;
  readonly version: string;
  remaster(input: Buffer): Promise<RemasterOutput | null>;
}
