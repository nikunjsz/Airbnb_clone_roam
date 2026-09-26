"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Map, Marker } from "leaflet";
import type { Listing } from "@/lib/api/types";
import { money } from "@/lib/listings";

interface InteractiveMapProps {
  listings: Listing[];
  selectedListingId?: number | null;
  onSelectListing?: (id: number) => void;
}

export function InteractiveMap({
  listings,
  selectedListingId,
  onSelectListing,
}: InteractiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const markersRef = useRef<{ [id: number]: Marker }>({});
  const [mapError, setMapError] = useState<boolean>(false);
  const [leafletLoaded, setLeafletLoaded] = useState<boolean>(false);


  useEffect(() => {
    let isMounted = true;

    // Dynamically import Leaflet only on browser client
    import("leaflet")
      .then((L) => {
        if (!isMounted || !mapContainerRef.current) return;

        // Load Leaflet CSS
        if (!document.getElementById("leaflet-css")) {
          const link = document.createElement("link");
          link.id = "leaflet-css";
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(link);
        }

        // Initialize map if not already created
        if (!mapInstanceRef.current) {
          // Default center: India or first listing location
          const initialLat = listings[0]?.latitude || 20.5937;
          const initialLng = listings[0]?.longitude || 78.9629;

          const map = L.map(mapContainerRef.current, {
            center: [initialLat, initialLng],
            zoom: listings.length === 1 ? 12 : 5,
            scrollWheelZoom: true,
          });

          const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
          });

          tileLayer.on("tileerror", () => {
            if (isMounted) setMapError(true);
          });

          tileLayer.addTo(map);
          mapInstanceRef.current = map;
        }

        setLeafletLoaded(true);
      })
      .catch(() => {
        if (isMounted) setMapError(true);
      });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers when listings change or leaflet loads
  useEffect(() => {
    if (!leafletLoaded || !mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      // Clear old markers
      Object.values(markersRef.current).forEach((m) => m.remove());
      markersRef.current = {};

      if (listings.length === 0) return;

      const bounds = L.latLngBounds([]);

      listings.forEach((listing) => {
        if (listing.latitude && listing.longitude) {
          const latLng: [number, number] = [listing.latitude, listing.longitude];
          bounds.extend(latLng);

          const isSelected = selectedListingId === listing.id;

          // Custom price badge marker
          const priceText = money(listing.nightly_price_minor);
          const customIcon = L.divIcon({
            className: `map-price-pin ${isSelected ? "selected" : ""}`,
            html: `<span>${priceText}</span>`,
            iconSize: [60, 28],
            iconAnchor: [30, 14],
          });

          const marker = L.marker(latLng, { icon: customIcon }).addTo(map);

          const popupContent = document.createElement("div");
          popupContent.className = "map-popup-card";
          popupContent.innerHTML = `
            <a href="/listings/${listing.id}" target="_blank" rel="noopener noreferrer" class="map-popup-link">
              <div class="map-popup-image" style="background-image: url('${listing.photos[0]?.url || "/images/listings/manali-villa.jpg"}')"></div>
              <div class="map-popup-details">
                <h3>${listing.title}</h3>
                <p class="map-popup-sub">${listing.city}, ${listing.region}</p>
                <div class="map-popup-footer">
                  <strong>${money(listing.nightly_price_minor)}</strong> / night
                  <span class="map-popup-rating">★ ${listing.rating ? listing.rating.toFixed(2) : "New"}</span>
                </div>
              </div>
            </a>
          `;

          marker.bindPopup(popupContent, { maxWidth: 240, className: "custom-leaflet-popup" });

          marker.on("click", () => {
            if (onSelectListing) onSelectListing(listing.id);
          });

          markersRef.current[listing.id] = marker;
        }
      });

      if (listings.length > 0 && bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      }
    });
  }, [listings, selectedListingId, leafletLoaded, onSelectListing]);

  if (mapError) {
    return (
      <div className="map-fallback-panel">
        <div className="fallback-icon">🗺️</div>
        <h3>Map unavailable</h3>
        <p>Could not load interactive map tiles. Please use the stays grid view.</p>
        <ul className="fallback-list">
          {listings.slice(0, 10).map((l) => (
            <li key={l.id}>
              <Link href={`/listings/${l.id}`}>
                <strong>{l.title}</strong> — {l.city}, {l.region} ({money(l.nightly_price_minor)}/night)
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="interactive-map-wrapper">
      <div ref={mapContainerRef} className="map-container" />
    </div>
  );
}
