import { supabase } from "@/integrations/supabase/client";

/**
 * Extract a frame from a video file at a given time (default 1 second)
 * and return it as a Blob (JPEG).
 */
export function extractVideoThumbnail(
  videoFile: File | string,
  timeInSeconds = 1
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";

    const src =
      typeof videoFile === "string"
        ? videoFile
        : URL.createObjectURL(videoFile);

    const cleanup = () => {
      if (typeof videoFile !== "string") {
        URL.revokeObjectURL(src);
      }
    };

    video.onloadedmetadata = () => {
      // Seek to the requested time (or halfway if video is shorter)
      video.currentTime = Math.min(timeInSeconds, video.duration / 2);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          cleanup();
          reject(new Error("Could not get canvas context"));
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            cleanup();
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to create thumbnail blob"));
            }
          },
          "image/jpeg",
          0.85
        );
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Failed to load video for thumbnail extraction"));
    };

    video.src = src;
  });
}

/**
 * Extract a thumbnail from a video, upload it to storage, and return the public URL.
 */
export async function generateAndUploadThumbnail(
  videoSource: File | string,
  userId: string
): Promise<string> {
  const blob = await extractVideoThumbnail(videoSource);
  const fileName = `${userId}/${Date.now()}-auto-thumb.jpg`;

  const { error } = await supabase.storage
    .from("exercise-images")
    .upload(fileName, blob, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from("exercise-images").getPublicUrl(fileName);

  return publicUrl;
}
