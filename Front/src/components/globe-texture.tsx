"use client";
import { useEffect, useState } from "react";
import { geoOrthographic } from "d3-geo";

// The texture is projected locally. No map provider or API is contacted.
const textureCache = new Map<string, string>();
let pixels: Promise<{ day: ImageData; night: ImageData }> | undefined;
function loadPixels(src: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");
      if (!context) return reject(new Error("Canvas unavailable"));
      context.drawImage(image, 0, 0);
      resolve(context.getImageData(0, 0, image.width, image.height));
    };
    image.onerror = reject;
    image.src = src;
  });
}

export function GlobeTexture({
  rotation,
  mode,
}: {
  rotation: number;
  mode: "earth" | "pandemic";
}) {
  const [texture, setTexture] = useState<string>();
  useEffect(() => {
    let live = true;
    const key = `${mode}-${rotation}`;
    const cached = textureCache.get(key);
    if (cached) {
      setTexture(cached);
      return;
    }
    pixels ??= Promise.all([
      loadPixels("/textures/earth-day.jpg"),
      loadPixels("/textures/earth-night.png"),
    ]).then(([day, night]) => ({ day, night }));
    pixels
      .then(({ day, night }) => {
        if (!live) return;
        const size = 520;
        const radius = size / 2;
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        const context = canvas.getContext("2d");
        if (!context) return;
        const result = context.createImageData(size, size);
        const projection = geoOrthographic()
          .rotate([70 + rotation, -5, 0])
          .translate([radius, radius])
          .scale(radius);
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const nx = (x - radius) / radius;
            const ny = (radius - y) / radius;
            const r2 = nx * nx + ny * ny;
            if (r2 >= 1) continue;
            const location = projection.invert?.([x, y]);
            if (!location) continue;
            const u = (location[0] + 180) / 360;
            const v = (90 - location[1]) / 180;
            const di =
              (Math.min(day.height - 1, Math.floor(v * day.height)) *
                day.width +
                Math.min(day.width - 1, Math.floor(u * day.width))) *
              4;
            const ni =
              (Math.min(night.height - 1, Math.floor(v * night.height)) *
                night.width +
                Math.min(night.width - 1, Math.floor(u * night.width))) *
              4;
            const z = Math.sqrt(1 - r2);
            const light = Math.max(0.12, -0.35 * nx + 0.45 * ny + 0.7 * z);
            const rim = Math.pow(1 - z, 4);
            const out = (y * size + x) * 4;
            const daylight = mode === "earth" ? 0.24 : 0.68;
            const nightlight = mode === "earth" ? 1.25 : 0.24;
            result.data[out] =
              day.data[di] * daylight * light +
              night.data[ni] * nightlight +
              rim * 30;
            result.data[out + 1] =
              day.data[di + 1] * daylight * light +
              night.data[ni + 1] * nightlight +
              9 +
              rim * 65;
            result.data[out + 2] =
              day.data[di + 2] * daylight * light +
              night.data[ni + 2] * nightlight +
              18 +
              rim * 85;
            result.data[out + 3] = Math.min(255, (1 - r2) * 35000);
          }
        }
        context.putImageData(result, 0, 0);
        const data = canvas.toDataURL("image/png");
        textureCache.set(key, data);
        if (live) setTexture(data);
      })
      .catch(() => {
        /* The geographic vector layer remains available offline. */
      });
    return () => {
      live = false;
    };
  }, [rotation, mode]);
  return texture ? (
    <image
      data-texture="ready"
      href={texture}
      x="145"
      y="35"
      width="430"
      height="430"
    />
  ) : null;
}
