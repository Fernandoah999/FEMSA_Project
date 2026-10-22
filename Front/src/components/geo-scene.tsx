"use client";
import { useEffect, useMemo, useState } from "react";
import {
  geoGraticule10,
  geoOrthographic,
  geoEquirectangular,
  geoMercator,
  geoPath,
} from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { FeatureCollection, Geometry } from "geojson";
import { regions, type StyleId } from "@/lib/data";
import { GlobeTexture } from "./globe-texture";

type Props = {
  styleId: StyleId;
  variant: number;
  region: string;
  onRegion: (id: string) => void;
};
export function GeoScene({ styleId, variant, region, onRegion }: Props) {
  const [land, setLand] = useState<FeatureCollection<Geometry> | null>(null);
  const [error, setError] = useState(false);
  const [rotation, setRotation] = useState(0);
  useEffect(() => {
    let live = true;
    fetch("/data/countries.json")
      .then((r) => {
        if (!r.ok) throw Error("map");
        return r.json();
      })
      .then((t: Topology<{ countries: GeometryCollection }>) => {
        if (live) setLand(feature(t, t.objects.countries));
      })
      .catch(() => {
        if (live) setError(true);
      });
    return () => {
      live = false;
    };
  }, []);
  const flat =
    styleId === "tracking" ||
    styleId === "territory" ||
    (styleId === "femsa" && variant === 2);
  const topo = styleId === "estrato";
  const projection = useMemo(
    () =>
      styleId === "territory"
        ? geoMercator().center([-77, -9]).scale(260).translate([360, 215])
        : flat
          ? geoEquirectangular()
              .center([-55, -7])
              .scale(190)
              .translate([390, 250])
          : geoOrthographic()
              .rotate([70 + rotation, -5, 0])
              .scale(215)
              .translate([360, 250])
              .clipAngle(90),
    [flat, rotation, styleId],
  );
  const path = geoPath(projection);
  const selected = regions.find((r) => r.id === region);
  const contours = useMemo(
    () =>
      Array.from({ length: 42 }, (_, k) => {
        const points = Array.from({ length: 121 }, (_, j) => {
          const a = (j / 120) * Math.PI * 2;
          const r =
            20 +
            k * 4.6 +
            Math.sin(a * 3 + k * 0.055) * (6 + k * 0.32) +
            Math.cos(a * 5 + k * 0.04) * 7;
          // Stable precision avoids engine-level trigonometric differences in SSR.
          const elevation = Math.pow((42 - k) / 42, 1.65) * 180;
          return `${(360 + Math.cos(a) * r * 1.45 + Math.sin(k * 0.035) * 12).toFixed(3)},${(310 + Math.sin(a) * r * 0.72 - elevation).toFixed(3)}`;
        });
        return `M${points.join("L")}Z`;
      }),
    [],
  );
  return (
    <div
      className={`geo-scene ${flat ? "flat-map" : ""} ${topo ? "topo-map" : ""}`}
    >
      <div className="map-caption">
        <span>
          {topo
            ? "TOPOGRAFÍA DE EXPOSICIÓN"
            : flat
              ? "DISTRIBUCIÓN REGIONAL"
              : "INFRAESTRUCTURA CONECTADA"}
        </span>
        <span>{selected?.name ?? "LATINOAMÉRICA"} / 05 SEDES</span>
      </div>
      <svg
        className="world"
        viewBox="0 0 720 500"
        role="group"
        aria-label={
          topo
            ? "Curvas topográficas ilustrativas de concentración de riesgo"
            : "Mapa de sedes de demostración en Latinoamérica"
        }
      >
        <defs>
          <radialGradient id={`sphere-${styleId}-${variant}`} cx="32%" cy="27%">
            <stop offset="0%" stopColor="var(--globe-lit)" />
            <stop offset="70%" stopColor="var(--globe-base)" />
            <stop offset="100%" stopColor="var(--bg)" />
          </radialGradient>
          <pattern
            id={`dots-${styleId}`}
            width="5"
            height="5"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r=".8" fill="var(--map-dot)" />
          </pattern>
          <clipPath id={`clip-${styleId}-${variant}`}>
            <rect width="720" height="500" />
          </clipPath>
        </defs>
        {topo ? (
          <g className="contours">
            {contours.map((d, i) => (
              <path
                key={i}
                d={d}
                fill="none"
                stroke={i % 7 === 0 ? "var(--accent)" : "var(--ink)"}
                strokeOpacity={i % 7 === 0 ? 0.6 : 0.27}
                strokeWidth={i % 7 === 0 ? 0.9 : 0.65}
              />
            ))}
            <line
              x1="360"
              y1="30"
              x2="360"
              y2="445"
              stroke="var(--line)"
              strokeDasharray="3 5"
            />
            <line
              x1="80"
              y1="280"
              x2="650"
              y2="280"
              stroke="var(--line)"
              strokeDasharray="3 5"
            />
            <text x="375" y="50" fill="var(--muted)" fontSize="11">
              EXPOSICIÓN / 9.8
            </text>
          </g>
        ) : (
          <g clipPath={`url(#clip-${styleId}-${variant})`}>
            {!flat && (
              <>
                <circle
                  cx="360"
                  cy="250"
                  r="238"
                  fill="none"
                  stroke="var(--accent)"
                  opacity=".15"
                  strokeDasharray="2 9"
                />
                <ellipse
                  cx="360"
                  cy="250"
                  rx="283"
                  ry="96"
                  transform="rotate(-27 360 250)"
                  fill="none"
                  stroke="var(--accent)"
                  opacity=".22"
                />
                <circle
                  cx="360"
                  cy="250"
                  r="215"
                  fill={`url(#sphere-${styleId}-${variant})`}
                  stroke="var(--map-line)"
                />
              </>
            )}
            {(styleId === "earth" || styleId === "pandemic") && (
              <GlobeTexture rotation={rotation} mode={styleId} />
            )}
            {styleId === "territory" &&
              [36, 24, 12].map((depth) => (
                <g
                  key={depth}
                  transform={`translate(0 ${depth})`}
                  opacity={0.45 + depth / 100}
                >
                  {land?.features
                    .filter((f) =>
                      ["484", "076", "170", "152", "032"].includes(
                        String(f.id).padStart(3, "0"),
                      ),
                    )
                    .map((f, i) => (
                      <path
                        key={i}
                        d={path(f) ?? ""}
                        fill={depth === 36 ? "#0b2635" : "#143b4c"}
                        stroke="var(--accent)"
                        strokeWidth=".65"
                      />
                    ))}
                </g>
              ))}
            <path
              d={path(geoGraticule10()) ?? ""}
              fill="none"
              stroke="var(--map-line)"
              strokeWidth=".5"
              opacity=".4"
            />
            {land?.features.map((f, i) => (
              <path
                key={i}
                d={path(f) ?? ""}
                fill={
                  styleId === "earth"
                    ? "transparent"
                    : styleId === "pandemic"
                      ? ["484", "076", "170"].includes(
                          String(f.id).padStart(3, "0"),
                        )
                        ? "#f57970"
                        : "transparent"
                      : styleId === "territory"
                        ? ["484", "076", "170", "152", "032"].includes(
                            String(f.id).padStart(3, "0"),
                          )
                          ? "#28768b"
                          : "transparent"
                        : styleId === "iot" || styleId === "tracking"
                          ? `url(#dots-${styleId})`
                          : "var(--land)"
                }
                fillOpacity={styleId === "pandemic" ? 0.45 : 1}
                stroke="var(--map-line)"
                strokeWidth={styleId === "earth" ? ".22" : ".6"}
              />
            ))}
            {styleId === "pandemic" &&
              regions.map((r) => {
                const p = projection(r.coords);
                return (
                  p && (
                    <g key={r.id} opacity=".6">
                      <circle
                        cx={p[0]}
                        cy={p[1]}
                        r={12 + r.critical / 8}
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth="1"
                        strokeDasharray="2 3"
                      />
                      <circle
                        cx={p[0]}
                        cy={p[1]}
                        r={8 + r.critical / 13}
                        fill="var(--accent)"
                        opacity=".19"
                      />
                    </g>
                  )
                );
              })}
            {styleId === "territory" && (
              <g fill="var(--muted)" fontSize="9">
                <text x="30" y="405">
                  03 / EXPOSICIÓN
                </text>
                <text x="30" y="425">
                  02 / SOFTWARE
                </text>
                <text x="30" y="445">
                  01 / INFRAESTRUCTURA
                </text>
                <path
                  d="M175 402h85M175 422h65M175 442h45"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth=".6"
                />
              </g>
            )}
            {regions.slice(1).map((r) => (
              <path
                key={r.id}
                d={
                  path({
                    type: "LineString",
                    coordinates: [regions[0].coords, r.coords],
                  }) ?? ""
                }
                fill="none"
                stroke="var(--accent)"
                strokeWidth="1"
                strokeDasharray="3 5"
                opacity=".65"
              />
            ))}
            {styleId === "iot" &&
              Array.from({ length: 60 }, (_, i) => (
                <line
                  key={i}
                  x1="360"
                  x2="360"
                  y1="10"
                  y2={i % 5 === 0 ? 23 : 16}
                  stroke={i % 5 === 0 ? "var(--accent)" : "var(--muted)"}
                  transform={`rotate(${i * 6} 360 250)`}
                  opacity=".6"
                />
              ))}
          </g>
        )}
        {regions.map((r, i) => {
          const point = topo
            ? [
                [262, 169],
                [472, 298],
                [350, 238],
                [281, 330],
                [454, 378],
              ][i]
            : projection(r.coords);
          if (!point) return null;
          const [x, y] = point.map((coordinate) =>
            Number(coordinate.toFixed(3)),
          );
          const labelX = r.id === "cl" ? x - 14 : x + 15;
          const labelY = r.id === "ar" ? y + 15 : y - 12;
          return (
            <g
              key={r.id}
              className={`map-node ${region === r.id ? "selected" : ""}`}
              role="button"
              tabIndex={0}
              aria-label={`Seleccionar ${r.name}`}
              aria-pressed={region === r.id}
              onClick={() => onRegion(region === r.id ? "all" : r.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onRegion(region === r.id ? "all" : r.id);
                }
              }}
            >
              <circle cx={x} cy={y} r="19" fill="transparent" />
              <circle
                cx={x}
                cy={y}
                r={region === r.id ? 13 : 9}
                fill="var(--accent)"
                opacity=".15"
              />
              <circle
                cx={x}
                cy={y}
                r="3.5"
                fill="var(--accent)"
                stroke="var(--bg)"
                strokeWidth="1.5"
              />
              <text
                x={labelX}
                y={labelY}
                textAnchor={r.id === "cl" ? "end" : "start"}
                fill="var(--ink)"
                fontSize="10"
                fontWeight="600"
              >
                {r.city.toUpperCase()}
              </text>
              <text
                x={labelX}
                y={labelY + 14}
                textAnchor={r.id === "cl" ? "end" : "start"}
                fill="var(--muted)"
                fontSize="9"
              >
                {r.critical} críticos
              </text>
            </g>
          );
        })}
      </svg>
      {!land && !topo && (
        <span className="map-loading">
          {error
            ? "Mapa no disponible. Puedes elegir una sede en la lista."
            : "Cargando cartografía…"}
        </span>
      )}
      <div className="map-footer">
        <span>
          <i className="status-dot" />
          {topo
            ? "Mayor altura = mayor exposición · ilustrativo"
            : "Selecciona una sede para explorar"}
        </span>
        {!flat && !topo && (
          <div>
            <button
              aria-label="Girar mapa a la izquierda"
              onClick={() => setRotation((r) => Math.max(-25, r - 10))}
            >
              ←
            </button>
            <button
              aria-label="Restablecer vista del mapa"
              onClick={() => setRotation(0)}
            >
              Centrar
            </button>
            <button
              aria-label="Girar mapa a la derecha"
              onClick={() => setRotation((r) => Math.min(25, r + 10))}
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
