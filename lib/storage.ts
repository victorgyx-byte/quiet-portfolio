"use client";

import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase";
import type { ReflectionImage } from "@/types/reflection";

const MAX_WIDTH = 1600;
const JPEG_QUALITY = 0.82;
const UPLOAD_CONCURRENCY = 2;

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not decode image."));
    image.src = dataUrl;
  });
}

async function compressImage(file: File) {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);

  const ratio = Math.min(1, MAX_WIDTH / image.width);
  const width = Math.round(image.width * ratio);
  const height = Math.round(image.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) return file;

  context.drawImage(image, 0, 0, width, height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (!blob) reject(new Error("Could not compress image."));
        else resolve(blob);
      },
      "image/jpeg",
      JPEG_QUALITY
    );
  });
}

export async function uploadReflectionImages(userId: string, files: File[]) {
  async function uploadOne(file: File, index: number) {
    const timestamp = Date.now();
    const safeName = file.name.replace(/\s+/g, "_");
    const path = `reflections/${userId}/${timestamp}-${index}-${safeName}.jpg`;
    const fileRef = ref(storage, path);

    const blob = await compressImage(file);
    await uploadBytes(fileRef, blob, { contentType: "image/jpeg" });
    const url = await getDownloadURL(fileRef);

    return {
      url,
      path,
      contentType: "image/jpeg",
      size: blob.size
    } as ReflectionImage;
  }

  const uploads: ReflectionImage[] = [];
  for (let start = 0; start < files.length; start += UPLOAD_CONCURRENCY) {
    const batch = files.slice(start, start + UPLOAD_CONCURRENCY);
    const batchUploads = await Promise.all(
      batch.map((file, offset) => uploadOne(file, start + offset))
    );
    uploads.push(...batchUploads);
  }

  return uploads;
}
