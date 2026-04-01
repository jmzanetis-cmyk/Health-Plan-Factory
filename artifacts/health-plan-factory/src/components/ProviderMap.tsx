import { useEffect, useRef, useState } from "react";
import { Loader, importLibrary } from "@googlemaps/js-api-loader";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";

interface ProviderMapProps {
  lat: number;
  lng: number;
  providerName?: string;
  address?: string;
  className?: string;
}

let initialized = false;

function ensureLoader() {
  if (!initialized && API_KEY) {
    new Loader({ apiKey: API_KEY, version: "weekly" });
    initialized = true;
  }
}

function buildInfoWindowContent(providerName?: string, address?: string): HTMLElement {
  const container = document.createElement("div");
  container.style.fontFamily = "sans-serif";
  container.style.fontSize = "14px";
  container.style.maxWidth = "220px";

  if (providerName) {
    const strong = document.createElement("strong");
    strong.textContent = providerName;
    container.appendChild(strong);
  }

  if (address) {
    if (providerName) container.appendChild(document.createElement("br"));
    const span = document.createElement("span");
    span.textContent = address;
    container.appendChild(span);
  }

  return container;
}

export function ProviderMap({ lat, lng, providerName, address, className }: ProviderMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!API_KEY) {
      setError("Google Maps API key is not configured.");
      return;
    }

    let cancelled = false;

    async function initMap() {
      ensureLoader();

      const { Map, InfoWindow } = await importLibrary("maps") as google.maps.MapsLibrary;
      const { Marker } = await importLibrary("marker") as google.maps.MarkerLibrary;

      if (cancelled || !mapRef.current) return;

      const map = new Map(mapRef.current, {
        center: { lat, lng },
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      const marker = new Marker({ position: { lat, lng }, map });

      if (providerName || address) {
        const infoWindow = new InfoWindow({
          content: buildInfoWindowContent(providerName, address),
        });
        marker.addListener("click", () => {
          infoWindow.open({ anchor: marker, map });
        });
      }
    }

    initMap().catch(() => {
      if (!cancelled) setError("Failed to load Google Maps.");
    });

    return () => {
      cancelled = true;
    };
  }, [lat, lng, providerName, address]);

  if (error) {
    return (
      <div
        className={className}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(212,34,126,0.04)",
          borderRadius: "12px",
          color: "var(--text-muted)",
          fontSize: "0.875rem",
          minHeight: "200px",
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className={className}
      style={{ minHeight: "200px", borderRadius: "12px", overflow: "hidden" }}
    />
  );
}
