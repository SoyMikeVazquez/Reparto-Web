"use client";

import React, { useEffect, useRef } from "react";

interface OrderRouteMapProps {
  start: [number, number];
  end: [number, number];
  routeCoordinates: [number, number][];
}

export const OrderRouteMap: React.FC<OrderRouteMapProps> = ({ start, end, routeCoordinates }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const startMarkerRef = useRef<any>(null);
  const endMarkerRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);

  // 1. Initialize Map ONCE on mount
  useEffect(() => {
    let active = true;
    if (typeof window === "undefined" || !mapRef.current) return;

    const initMap = async () => {
      const L = (await import("leaflet")).default;
      if (!active || !mapRef.current) return;
      leafletRef.current = L;

      // Clean up previous map if any
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
      }

      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView(start, 13);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;

      // Force size refresh to prevent rendering errors
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 200);
    };

    initMap();

    return () => {
      active = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
      }
    };
  }, []); // Run only once on mount!

  // 2. Update markers and route coordinates dynamically without destroying map
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = leafletRef.current;
    if (!map || !L) return;

    // Custom icons
    const branchIcon = L.divIcon({
      html: `<div style="background: #6366f1; width: 14px; height: 14px; border: 2.5px solid white; border-radius: 50%; box-shadow: 0 0 8px #6366f1;"></div>`,
      className: "",
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    const destIcon = L.divIcon({
      html: `<div style="background: #f7340c; width: 14px; height: 14px; border: 2.5px solid white; border-radius: 50%; box-shadow: 0 0 8px #f7340c;"></div>`,
      className: "",
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    // Update or create start marker
    if (startMarkerRef.current) {
      startMarkerRef.current.setLatLng(start);
    } else {
      startMarkerRef.current = L.marker(start, { icon: branchIcon }).addTo(map).bindPopup("Sucursal de Origen");
    }

    // Update or create end marker
    if (endMarkerRef.current) {
      endMarkerRef.current.setLatLng(end);
    } else {
      endMarkerRef.current = L.marker(end, { icon: destIcon }).addTo(map).bindPopup("Destino de Entrega");
    }

    // Clear previous line
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    // Draw route polyline
    if (routeCoordinates && routeCoordinates.length > 0) {
      polylineRef.current = L.polyline(routeCoordinates, {
        color: "#f7340c",
        weight: 4,
        opacity: 0.8,
        lineCap: "round"
      }).addTo(map);
    }

    // Zoom/Fit route bounds
    try {
      const bounds = L.latLngBounds([start, end]);
      map.fitBounds(bounds, { padding: [30, 30] });
    } catch {}

  }, [start, end, routeCoordinates]); // Run when start, end or route coordinates change

  return (
    <div 
      ref={mapRef} 
      style={{ 
        width: '100%', 
        height: '240px', 
        borderRadius: 'var(--radius-md)', 
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(0,0,0,0.05)',
        position: 'relative',
        zIndex: 10
      }} 
    />
  );
};
