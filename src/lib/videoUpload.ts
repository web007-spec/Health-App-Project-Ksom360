import * as tus from "tus-js-client";
import { supabase } from "@/integrations/supabase/client";

const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
const CHUNK_SIZE = 6 * 1024 * 1024; // 6MB (required by Supabase)
const RESUMABLE_THRESHOLD = 50 * 1024 * 1024; // Use resumable for files > 50MB

export interface UploadProgress {
  percentage: number;
  bytesUploaded: number;
  bytesTotal: number;
}

export function getMaxVideoSizeLabel(): string {
  return "2GB";
}

export function validateVideoFile(file: File): string | null {
  if (!file.type.startsWith("video/")) {
    return "Please select a video file";
  }
  if (file.size > MAX_VIDEO_SIZE) {
    return `Please select a video smaller than ${getMaxVideoSizeLabel()}`;
  }
  return null;
}

export async function uploadVideo(
  file: File,
  userId: string,
  bucket: string = "exercise-videos",
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  const fileExt = file.name.split(".").pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;

  if (file.size > RESUMABLE_THRESHOLD) {
    return resumableUpload(file, bucket, fileName, onProgress);
  } else {
    return standardUpload(file, bucket, fileName, onProgress);
  }
}

async function standardUpload(
  file: File,
  bucket: string,
  fileName: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  onProgress?.({ percentage: 0, bytesUploaded: 0, bytesTotal: file.size });

  const { error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) throw error;

  onProgress?.({ percentage: 100, bytesUploaded: file.size, bytesTotal: file.size });

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return publicUrl;
}

async function resumableUpload(
  file: File,
  bucket: string,
  fileName: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `https://${projectId}.supabase.co/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "x-upsert": "false",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: bucket,
        objectName: fileName,
        contentType: file.type,
        cacheControl: "3600",
      },
      chunkSize: CHUNK_SIZE,
      onError: function (error) {
        reject(error);
      },
      onProgress: function (bytesUploaded, bytesTotal) {
        const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
        onProgress?.({ percentage, bytesUploaded, bytesTotal });
      },
      onSuccess: function () {
        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);
        resolve(publicUrl);
      },
    });

    // Check for previous uploads to resume
    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length) {
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }
      upload.start();
    });
  });
}
