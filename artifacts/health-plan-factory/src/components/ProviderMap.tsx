import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import type { NPIProvider } from "@/lib/npiClient";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

const providerIcon = L.divIcon({
  className: "",
  html: `<div style="
    width: 22px;
    height: 22px;
    border-radius: 50% 50% 50% 0;
    background: #D4227E;
    transform: rotate(-45deg);
    border: 2.5px solid white;
    box-shadow: 0 2px 8px rgba(212,34,126,0.45);
  "></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 22],
  popupAnchor: [0, -24],
});

interface GeoPoint {
  lat: number;
  lng: number;
}

function BoundsAdjuster({ points }: { points: GeoPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 12);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
  }, [map, points]);
  return null;
}

interface ProviderMapProps {
  providers: NPIProvider[];
  geocoded: Record<string, GeoPoint | null>;
}

export function ProviderMap({ providers, geocoded }: ProviderMapProps) {
  const plotted = useMemo(() => {
    return providers
      .map((p) => {
        const key = `${p.city},${p.state}`.toLowerCase();
        const pt = geocoded[key];
        if (!pt) return null;
        return { provider: p, lat: pt.lat, lng: pt.lng };
      })
      .filter((x): x is { provider: NPIProvider; lat: number; lng: number } => x !== null);
  }, [providers, geocoded]);

  const points = useMemo(() => plotted.map((x) => ({ lat: x.lat, lng: x.lng })), [plotted]);

  const defaultCenter: [number, number] = [39.5, -98.35];
  const defaultZoom = 4;

  const geocodedCount = plotted.length;
  const totalCount = providers.length;

  return (
    <div style={{ position: "relative" }}>
      {geocodedCount < totalCount && (
        <div style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 1000,
          background: "rgba(26,42,58,0.88)",
          color: "white",
          fontSize: "0.7rem",
          fontFamily: "var(--app-font-sans)",
          padding: "0.3rem 0.65rem",
          borderRadius: 20,
          backdropFilter: "blur(4px)",
        }}>
          {geocodedCount === 0
            ? "Geocoding providers…"
            : `Showing ${geocodedCount} of ${totalCount} on map`}
        </div>
      )}
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: 520, borderRadius: 14, border: "1px solid rgba(212,34,126,0.1)" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.length > 0 && <BoundsAdjuster points={points} />}
        {plotted.map(({ provider, lat, lng }) => (
          <Marker
            key={provider.npi}
            position={[lat, lng]}
            icon={providerIcon}
          >
            <Popup>
              <div style={{ fontFamily: "var(--app-font-sans)", minWidth: 180 }}>
                <p style={{ fontWeight: 700, fontSize: "0.85rem", color: "#1a2a3a", marginBottom: "0.2rem" }}>
                  {provider.name}
                </p>
                {provider.specialty && (
                  <p style={{ fontSize: "0.72rem", color: "#6b8499", marginBottom: "0.25rem" }}>
                    {provider.specialty}
                  </p>
                )}
                {provider.address && (
                  <p style={{ fontSize: "0.72rem", color: "#6b8499", marginBottom: "0.35rem" }}>
                    {[provider.address, provider.city, provider.state, provider.zip].filter(Boolean).join(", ")}
                  </p>
                )}
                <a
                  href={`${BASE}/providers/search`}
                  style={{ fontSize: "0.72rem", fontWeight: 600, color: "#D4227E", textDecoration: "none" }}
                >
                  NPI #{provider.npi}
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
