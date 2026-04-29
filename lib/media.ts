import type { UploadedAsset } from "./cloudinary";

export type StoredMedia = {
  url: string;
  publicId: string;
  resourceType: "image" | "video";
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
  bytes?: number;
};

export function fromUpload(asset: UploadedAsset): StoredMedia {
  return {
    url: asset.url,
    publicId: asset.publicId,
    resourceType: asset.resourceType,
    thumbnailUrl: asset.thumbnailUrl,
    width: asset.width,
    height: asset.height,
    duration: asset.duration,
    bytes: asset.bytes,
  };
}

export function isVideo(m: StoredMedia): boolean {
  return m.resourceType === "video";
}
