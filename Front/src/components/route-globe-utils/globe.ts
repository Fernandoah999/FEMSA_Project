import samples from "@/lib/globe-land.json";

export type Vec3 = [number, number, number];
export type LandDot = { v: Vec3; region: number };
const RAD = Math.PI / 180;
export const toVec = (lon: number, lat: number): Vec3 => [Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD), Math.cos(lat * RAD) * Math.cos(lon * RAD)];
export function rotate(v: Vec3, yaw: number, tilt: number): Vec3 {
  const x = v[0] * Math.cos(yaw) - v[2] * Math.sin(yaw);
  const z = v[0] * Math.sin(yaw) + v[2] * Math.cos(yaw);
  return [x, v[1] * Math.cos(tilt) - z * Math.sin(tilt), v[1] * Math.sin(tilt) + z * Math.cos(tilt)];
}
export function slerp(a: Vec3, b: Vec3, t: number): Vec3 {
  const angle = Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
  if (angle < .00001) return a;
  const denominator = Math.sin(angle), k = Math.sin((1 - t) * angle) / denominator, l = Math.sin(t * angle) / denominator;
  return [a[0] * k + b[0] * l, a[1] * k + b[1] * l, a[2] * k + b[2] * l];
}
const DOTS: LandDot[] = samples.map(([lon, lat, region]) => ({ v: toVec(lon, lat), region }));
export const landDots = () => DOTS;

export function drawGlobe(ctx: CanvasRenderingContext2D, dots: LandDot[], camera: { cx: number; cy: number; r: number; yaw: number; tilt: number }, t: number, selected: number, reduced: boolean, hubs: Vec3[]) {
  const { cx, cy, r, yaw, tilt } = camera;
  // Back hemisphere remains very faint, so the sphere retains depth without a texture.
  for (const dot of dots) {
    const [x, y, z] = rotate(dot.v, yaw, tilt);
    const regionVisible = dot.region > 0 && (!selected || dot.region === selected);
    let alpha = z > 0 ? .20 + z * .36 : .035;
    if (z > 0 && regionVisible) {
      const h = hubs[dot.region - 1];
      const distance = Math.acos(Math.max(-1, Math.min(1, h[0] * dot.v[0] + h[1] * dot.v[1] + h[2] * dot.v[2])));
      const wave = ((t * .23 + dot.region * .23) % 1) * .9;
      alpha = reduced ? .9 : .43 + .57 * Math.exp(-Math.pow((distance - wave) / .13, 2));
    }
    ctx.globalAlpha = alpha;
    ctx.fillStyle = regionVisible ? "#ffffff" : "#b7a8b4";
    ctx.beginPath();
    ctx.arc(cx + x * r, cy - y * r, Math.max(.75, r / 190) * (regionVisible && z > 0 ? 1.12 : 1), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
