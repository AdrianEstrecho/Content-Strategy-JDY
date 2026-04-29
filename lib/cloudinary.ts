import {
  v2 as cloudinary,
  type UploadApiOptions,
  type UploadApiResponse,
} from "cloudinary";

let _configured = false;

function ensureConfigured() {
  if (_configured) return;
  const cloud = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const key = process.env.CLOUDINARY_API_KEY?.trim();
  const secret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloud || !key || !secret) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env."
    );
  }
  cloudinary.config({
    cloud_name: cloud,
    api_key: key,
    api_secret: secret,
    secure: true,
  });
  _configured = true;
}

export function isCloudinaryEnabled(): boolean {
  return (
    !!process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
    !!process.env.CLOUDINARY_API_KEY?.trim() &&
    !!process.env.CLOUDINARY_API_SECRET?.trim()
  );
}

export type UploadedAsset = {
  url: string; // public secure URL
  publicId: string;
  resourceType: "image" | "video";
  format: string;
  bytes: number;
  width?: number;
  height?: number;
  duration?: number;
  thumbnailUrl?: string;
};

function bufferToStream(buffer: Buffer): NodeJS.ReadableStream {
  const { Readable } = require("stream") as typeof import("stream");
  return Readable.from(buffer);
}

async function uploadStream(
  buffer: Buffer,
  options: UploadApiOptions
): Promise<UploadApiResponse> {
  ensureConfigured();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err || !result) return reject(err ?? new Error("Empty Cloudinary response"));
      resolve(result);
    });
    bufferToStream(buffer).pipe(stream);
  });
}

export async function uploadImage(
  buffer: Buffer,
  folder = "justdoyou/posts"
): Promise<UploadedAsset> {
  const res = await uploadStream(buffer, {
    folder,
    resource_type: "image",
    // IG requires JPEG. Force conversion.
    format: "jpg",
    transformation: [{ quality: "auto:good", fetch_format: "jpg" }],
  });
  return {
    url: res.secure_url,
    publicId: res.public_id,
    resourceType: "image",
    format: res.format,
    bytes: res.bytes,
    width: res.width,
    height: res.height,
  };
}

export async function uploadVideo(
  buffer: Buffer,
  folder = "justdoyou/posts"
): Promise<UploadedAsset> {
  // IG Reels requirements: H.264, AAC, MP4, ≤90s, ≤100MB, 9:16 preferred.
  const res = await uploadStream(buffer, {
    folder,
    resource_type: "video",
    eager: [
      {
        format: "mp4",
        video_codec: "h264",
        audio_codec: "aac",
        quality: "auto:good",
      },
    ],
    eager_async: false,
  });

  // Prefer the eager-transformed mp4 URL (guaranteed h264/aac).
  const eagerUrl = res.eager?.[0]?.secure_url;
  const url = eagerUrl ?? res.secure_url;

  // Generate a thumbnail from the first second.
  const thumbnailUrl = cloudinary.url(res.public_id, {
    resource_type: "video",
    format: "jpg",
    secure: true,
    transformation: [{ start_offset: "1", width: 600, crop: "scale" }],
  });

  return {
    url,
    publicId: res.public_id,
    resourceType: "video",
    format: "mp4",
    bytes: res.bytes,
    width: res.width,
    height: res.height,
    duration: res.duration,
    thumbnailUrl,
  };
}

export async function deleteAsset(
  publicId: string,
  resourceType: "image" | "video" = "image"
): Promise<void> {
  ensureConfigured();
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}
