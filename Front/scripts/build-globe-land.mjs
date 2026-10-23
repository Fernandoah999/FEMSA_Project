// Reproducible land sampling from the existing public-domain Natural Earth asset.
import { readFile, writeFile } from "node:fs/promises";
import { feature } from "topojson-client";
import { geoContains } from "d3-geo";
const topology = JSON.parse(await readFile("public/data/countries.json", "utf8"));
const countries = feature(topology, topology.objects.countries);
const targets = [840, 484, 76].map(id => countries.features.find(f => Number(f.id) === id));
if (targets.some(f => !f)) throw Error("Required reference countries are absent");
const dots = [];
const count = 24000, golden = Math.PI * (3 - Math.sqrt(5));
for (let i = 0; i < count; i++) {
  const lat = Math.asin(1 - 2 * (i + .5) / count) * 180 / Math.PI;
  const lon = ((i * golden * 180 / Math.PI) % 360) - 180;
  const p = [lon, lat];
  if (!geoContains(countries, p)) continue;
  const region = targets.findIndex(f => geoContains(f, p)) + 1;
  dots.push([+lon.toFixed(3), +lat.toFixed(3), region]);
}
await writeFile("src/lib/globe-land.json", JSON.stringify(dots));
await writeFile("src/lib/globe-countries.json", JSON.stringify({ type: "FeatureCollection", features: targets }));
console.log(`Saved ${dots.length} land points; country reference points:`, targets.map((_, i) => dots.filter(d => d[2] === i + 1).length));
