import { useState, useEffect, useRef } from "react";

/** Strips white/light backgrounds from an image, returning a data URL with transparency */
export function useTransparentIcon(src?: string) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!src) { setDataUrl(null); return; }
    if (cacheRef.current.has(src)) { setDataUrl(cacheRef.current.get(src)!); return; }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const brightness = (r + g + b) / 3;
        if (brightness > 220) {
          d[i + 3] = 0;
        } else if (brightness > 200) {
          d[i + 3] = Math.round((220 - brightness) / 20 * 255);
        }
      }
      ctx.putImageData(imageData, 0, 0);
      const url = canvas.toDataURL("image/png");
      cacheRef.current.set(src, url);
      setDataUrl(url);
    };
    img.onerror = () => setDataUrl(src);
    img.src = src;
  }, [src]);

  return dataUrl;
}
