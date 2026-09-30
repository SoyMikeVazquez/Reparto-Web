"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "./MapContainer.module.css";
import { useDashboard } from "../context/DashboardContext";
import { Layers, Navigation } from "lucide-react";
import type L from "leaflet";
import type mapboxgl from "mapbox-gl";

interface MapContainerProps {
  selectedOrderId?: string | null;
}

export const MapContainer: React.FC<MapContainerProps> = ({ selectedOrderId }) => {
  const { drivers, deliveries, settings, orders, branches } = useDashboard();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapType, setMapType] = useState<"leaflet" | "mapbox" | "loading">("loading");
  const [selectedOrderRoute, setSelectedOrderRoute] = useState<[number, number][]>([]);

  // Keep references to active map libraries and instances to prevent re-initialization
  const leafletLibRef = useRef<typeof L | null>(null);
  const mapboxLibRef = useRef<typeof mapboxgl | null>(null);

  const mapInstanceRef = useRef<L.Map | mapboxgl.Map | null>(null);
  const leafletMarkersRef = useRef<{ [id: string]: L.Marker }>({});
  const mapboxMarkersRef = useRef<{ [id: string]: mapboxgl.Marker }>({});
  const polylineInstanceRef = useRef<{ [id: string]: L.Polyline }>({});

  const mapCenterRef = useRef<[number, number]>(settings.mapCenter);

  // Sync map center ref
  useEffect(() => {
    mapCenterRef.current = settings.mapCenter;
  }, [settings.mapCenter]);

  // Fetch route coordinates for selected order
  useEffect(() => {
    if (!selectedOrderId) {
      setSelectedOrderRoute([]);
      return;
    }

    const order = orders.find(o => o.id === selectedOrderId);
    if (!order || order.lat === undefined || order.lat === null || order.lng === undefined || order.lng === null) {
      setSelectedOrderRoute([]);
      return;
    }

    const branch = branches.find(b => b.id === order.idSucursal);
    if (!branch || branch.lat === undefined || branch.lat === null || branch.lng === undefined || branch.lng === null) {
      setSelectedOrderRoute([]);
      return;
    }

    let active = true;
    const getOrderRoute = async () => {
      const start: [number, number] = [branch.lat!, branch.lng!];
      const end: [number, number] = [order.lat!, order.lng!];
      
      const token = settings.mapboxToken;
      if (token && token.trim().startsWith("pk.")) {
        try {
          const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start[1]},${start[0]};${end[1]},${end[0]}?geometries=geojson&access_token=${token}`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (data.routes && data.routes[0]) {
              const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
              if (active) {
                setSelectedOrderRoute(coords);
                return;
              }
            }
          }
        } catch {}
      }
      
      // Fallback
      const coords = [[start[0], start[1]], [end[0], end[1]]] as [number, number][];
      if (active) setSelectedOrderRoute(coords);
    };

    getOrderRoute();

    return () => {
      active = false;
    };
  }, [selectedOrderId, orders, branches, settings.mapboxToken]);



  // Cleanup helper
  const cleanupMaps = () => {
    if (mapInstanceRef.current) {
      try {
        // Clean up any markers and polylines if they exist
        Object.values(leafletMarkersRef.current).forEach((marker) => {
          try { marker.remove(); } catch {}
        });
        Object.values(polylineInstanceRef.current).forEach((poly) => {
          try { poly.remove(); } catch {}
        });
        Object.values(mapboxMarkersRef.current).forEach((marker) => {
          try { marker.remove(); } catch {}
        });

        // Destroy the map instance
        mapInstanceRef.current.remove();
      } catch (e) {
        console.warn("Map cleanup warning:", e);
      }
    }
    mapInstanceRef.current = null;
    leafletMarkersRef.current = {};
    mapboxMarkersRef.current = {};
    polylineInstanceRef.current = {};
  };

  // LEAFLET UPDATE LOGIC
  const updateLeafletElements = () => {
    const L = leafletLibRef.current;
    if (!L || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current as L.Map;

    // A. Render Drivers
    drivers.forEach((driver) => {
      const markerId = `driver-${driver.id}`;
      const hasIncident = driver.status === "offline" && driver.battery < 20;

      // Custom divIcon to style driver marker beautifully
      const iconHtml = `
        <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
          <div style="
            position: absolute; 
            width: 14px; 
            height: 14px; 
            background: ${hasIncident ? "var(--danger)" : driver.color}; 
            border: 2.5px solid #ffffff; 
            border-radius: 50%;
            box-shadow: 0 0 10px ${hasIncident ? "var(--danger)" : driver.color};
            z-index: 2;
          "></div>
          <div class="${driver.status === "on_delivery" ? "pulsing-glow" : ""}" style="
            position: absolute; 
            width: 24px; 
            height: 24px; 
            border-radius: 50%;
            background: ${driver.color}; 
            opacity: 0.25; 
            z-index: 1;
          "></div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: "",
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      if (leafletMarkersRef.current[markerId]) {
        // Move marker
        leafletMarkersRef.current[markerId].setLatLng([driver.lat, driver.lng]);
        leafletMarkersRef.current[markerId].setIcon(customIcon);
      } else {
        // Create marker
        const marker = L.marker([driver.lat, driver.lng], { icon: customIcon }).addTo(map);
        
        // Add popup
        const popupContent = `
          <div style="padding: 4px; min-width: 140px;">
            <strong style="color: var(--text-primary); font-size: 0.9rem;">${driver.name}</strong><br/>
            <span style="font-size: 0.75rem; color: var(--text-secondary);">${driver.vehicle} • ${driver.phone}</span><br/>
            <div style="margin-top: 6px; display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem;">
              <span style="padding: 2px 6px; border-radius: 4px; font-weight:600; background: ${
                driver.status === "on_delivery" 
                  ? "var(--primary-glow); color: var(--primary);" 
                  : driver.status === "online" 
                    ? "var(--success-glow); color: var(--success);" 
                    : "rgba(255,255,255,0.05); color: var(--text-muted);"
              }">${driver.status === "on_delivery" ? "En Ruta" : driver.status === "online" ? "Disponible" : "Desconectado"}</span>
              <span style="color: ${driver.battery < 20 ? "var(--danger)" : "var(--success)"}">${driver.battery}% Batería</span>
            </div>
          </div>
        `;
        marker.bindPopup(popupContent);
        leafletMarkersRef.current[markerId] = marker;
      }
    });

    // Remove deleted drivers
    Object.keys(leafletMarkersRef.current).forEach((key) => {
      if (key.startsWith("driver-")) {
        const id = key.replace("driver-", "");
        if (!drivers.some((d) => d.id === id)) {
          leafletMarkersRef.current[key].remove();
          delete leafletMarkersRef.current[key];
        }
      }
    });

    // B. Render Deliveries (Orders)
    deliveries.forEach((delivery) => {
      if (delivery.status === "delivered" || delivery.status === "canceled") {
        // If order completed, make sure marker is removed
        const markerId = `delivery-${delivery.id}`;
        if (leafletMarkersRef.current[markerId]) {
          leafletMarkersRef.current[markerId].remove();
          delete leafletMarkersRef.current[markerId];
        }
        return;
      }

      const markerId = `delivery-${delivery.id}`;
      const color = delivery.status === "pending" ? "var(--warning)" : "var(--primary)";

      // Package flag icon
      const iconHtml = `
        <div style="
          position: relative; 
          width: 28px; 
          height: 28px; 
          display: flex; 
          align-items: center; 
          justify-content: center;
          background: ${color};
          border: 2px solid white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
          transform: rotate(45deg);
        ">
          <div style="
            transform: rotate(-45deg); 
            color: white; 
            font-size: 0.65rem; 
            font-weight: 800;
          ">📦</div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: "",
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      if (leafletMarkersRef.current[markerId]) {
        leafletMarkersRef.current[markerId].setLatLng([delivery.lat, delivery.lng]);
        leafletMarkersRef.current[markerId].setIcon(customIcon);
      } else {
        const marker = L.marker([delivery.lat, delivery.lng], { icon: customIcon }).addTo(map);
        const popupContent = `
          <div style="padding: 4px; min-width: 150px;">
            <strong style="color: var(--text-primary); font-size: 0.85rem;">Orden: ${delivery.customer}</strong><br/>
            <span style="font-size: 0.75rem; color: var(--text-secondary);">${delivery.address}</span><br/>
            <p style="font-size: 0.7rem; color: var(--text-muted); margin-top: 4px;">Items: ${delivery.items}</p>
            <div style="margin-top: 6px; font-size: 0.75rem; font-weight:600; color: ${
              delivery.status === "pending" ? "var(--warning)" : "var(--primary)"
            }">
              Estatus: ${delivery.status === "pending" ? "Por Asignar" : "En Tránsito"}
            </div>
          </div>
        `;
        marker.bindPopup(popupContent);
        leafletMarkersRef.current[markerId] = marker;
      }
    });

    // Remove deleted/completed deliveries
    Object.keys(leafletMarkersRef.current).forEach((key) => {
      if (key.startsWith("delivery-")) {
        const id = key.replace("delivery-", "");
        const del = deliveries.find((d) => d.id === id);
        if (!del || del.status === "delivered" || del.status === "canceled") {
          leafletMarkersRef.current[key].remove();
          delete leafletMarkersRef.current[key];
        }
      }
    });

    // C. Draw Polylines for Active Routes
    drivers.forEach((driver) => {
      const polyId = `route-${driver.id}`;
      if (driver.status === "on_delivery" && driver.currentRoute.length > 0) {
        // Draw polyline
        const remainingRoute = driver.currentRoute.slice(driver.routeIndex);
        if (remainingRoute.length > 0) {
          if (polylineInstanceRef.current[polyId]) {
            polylineInstanceRef.current[polyId].setLatLngs(remainingRoute);
          } else {
            const polyline = L.polyline(remainingRoute, {
              color: driver.color,
              weight: 4,
              opacity: 0.8,
              dashArray: "8, 8",
              lineCap: "round"
            }).addTo(map);
            polylineInstanceRef.current[polyId] = polyline;
          }
        }
      } else {
        // Remove polyline if inactive
        if (polylineInstanceRef.current[polyId]) {
          polylineInstanceRef.current[polyId].remove();
          delete polylineInstanceRef.current[polyId];
        }
      }
    });

    // Render Selected Order Route
    const selectedOrder = orders.find(o => o.id === selectedOrderId);
    const branch = selectedOrder ? branches.find(b => b.id === selectedOrder.idSucursal) : null;
    const hasBranchCoords = branch && branch.lat !== null && branch.lat !== undefined && branch.lng !== null && branch.lng !== undefined;
    
    const startMarkerId = "selected-order-start";
    const endMarkerId = "selected-order-end";
    const selectedRouteId = "selected-order-route";

    if (selectedOrder && hasBranchCoords && selectedOrder.lat && selectedOrder.lng) {
      // Branch marker
      const startIcon = L.divIcon({
        html: `<div style="background: #0f172a; width: 16px; height: 16px; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
        className: "",
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
      // Destination marker
      const endIcon = L.divIcon({
        html: `<div style="background: #f7340c; width: 16px; height: 16px; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px #f7340c;"></div>`,
        className: "",
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      if (leafletMarkersRef.current[startMarkerId]) {
        leafletMarkersRef.current[startMarkerId].setLatLng([branch.lat!, branch.lng!]);
      } else {
        leafletMarkersRef.current[startMarkerId] = L.marker([branch.lat!, branch.lng!], { icon: startIcon }).addTo(map).bindPopup(`Origen: ${branch.name}`);
      }

      if (leafletMarkersRef.current[endMarkerId]) {
        leafletMarkersRef.current[endMarkerId].setLatLng([selectedOrder.lat!, selectedOrder.lng!]);
      } else {
        leafletMarkersRef.current[endMarkerId] = L.marker([selectedOrder.lat!, selectedOrder.lng!], { icon: endIcon }).addTo(map).bindPopup(`Destino: ${selectedOrder.customerName}`);
      }

      if (selectedOrderRoute.length > 0) {
        if (polylineInstanceRef.current[selectedRouteId]) {
          polylineInstanceRef.current[selectedRouteId].setLatLngs(selectedOrderRoute);
        } else {
          polylineInstanceRef.current[selectedRouteId] = L.polyline(selectedOrderRoute, {
            color: "#f7340c",
            weight: 5,
            opacity: 0.9,
            lineCap: "round"
          }).addTo(map);
        }
      }

      // Auto zoom to fit the route
      try {
        const bounds = L.latLngBounds([[branch.lat!, branch.lng!], [selectedOrder.lat!, selectedOrder.lng!]]);
        map.fitBounds(bounds, { padding: [50, 50] });
      } catch {}
      
    } else {
      // Clean up markers and route if no order is selected
      if (leafletMarkersRef.current[startMarkerId]) {
        leafletMarkersRef.current[startMarkerId].remove();
        delete leafletMarkersRef.current[startMarkerId];
      }
      if (leafletMarkersRef.current[endMarkerId]) {
        leafletMarkersRef.current[endMarkerId].remove();
        delete leafletMarkersRef.current[endMarkerId];
      }
      if (polylineInstanceRef.current[selectedRouteId]) {
        polylineInstanceRef.current[selectedRouteId].remove();
        delete polylineInstanceRef.current[selectedRouteId];
      }
    }
  };

  // MAPBOX GL UPDATE LOGIC
  const updateMapboxElements = () => {
    const mapboxgl = mapboxLibRef.current;
    if (!mapboxgl || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current as mapboxgl.Map;

    // A. Render Drivers in Mapbox
    drivers.forEach((driver) => {
      const markerId = `driver-${driver.id}`;
      const hasIncident = driver.status === "offline" && driver.battery < 20;

      if (mapboxMarkersRef.current[markerId]) {
        // Update position
        mapboxMarkersRef.current[markerId].setLngLat([driver.lng, driver.lat]);
      } else {
        // Create custom element
        const el = document.createElement("div");
        el.style.width = "36px";
        el.style.height = "36px";
        el.style.display = "flex";
        el.style.alignItems = "center";
        el.style.justifyContent = "center";

        const dot = document.createElement("div");
        dot.style.position = "absolute";
        dot.style.width = "14px";
        dot.style.height = "14px";
        dot.style.backgroundColor = hasIncident ? "var(--danger)" : driver.color;
        dot.style.border = "2.5px solid #ffffff";
        dot.style.borderRadius = "50%";
        dot.style.boxShadow = `0 0 10px ${hasIncident ? "var(--danger)" : driver.color}`;
        dot.style.zIndex = "2";

        const pulse = document.createElement("div");
        pulse.style.position = "absolute";
        pulse.style.width = "24px";
        pulse.style.height = "24px";
        pulse.style.borderRadius = "50%";
        pulse.style.backgroundColor = driver.color;
        pulse.style.opacity = "0.25";
        pulse.style.zIndex = "1";
        if (driver.status === "on_delivery") {
          pulse.className = "pulsing-glow";
        }

        el.appendChild(dot);
        el.appendChild(pulse);

        // Add Popup
        const popup = new mapboxgl.Popup({ offset: 15 }).setHTML(`
          <div style="font-family: var(--font-family); color: #000; padding: 4px; min-width: 140px;">
            <strong style="font-size: 0.9rem;">${driver.name}</strong><br/>
            <span style="font-size: 0.75rem;">${driver.vehicle} • ${driver.phone}</span><br/>
            <div style="margin-top: 6px; display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem;">
              <span style="padding: 2px 6px; border-radius: 4px; font-weight:600; background: rgba(247,52,12,0.12); color: var(--primary);">${driver.status === "on_delivery" ? "En Ruta" : "Disponible"}</span>
              <span>${driver.battery}% Batería</span>
            </div>
          </div>
        `);

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([driver.lng, driver.lat])
          .setPopup(popup)
          .addTo(map);

        mapboxMarkersRef.current[markerId] = marker;
      }
    });

    // Clean up drivers
    Object.keys(mapboxMarkersRef.current).forEach((key) => {
      if (key.startsWith("driver-")) {
        const id = key.replace("driver-", "");
        if (!drivers.some((d) => d.id === id)) {
          mapboxMarkersRef.current[key].remove();
          delete mapboxMarkersRef.current[key];
        }
      }
    });

    // B. Render Deliveries (Orders) in Mapbox
    deliveries.forEach((delivery) => {
      if (delivery.status === "delivered" || delivery.status === "canceled") {
        const markerId = `delivery-${delivery.id}`;
        if (mapboxMarkersRef.current[markerId]) {
          mapboxMarkersRef.current[markerId].remove();
          delete mapboxMarkersRef.current[markerId];
        }
        return;
      }

      const markerId = `delivery-${delivery.id}`;
      const color = delivery.status === "pending" ? "#F7340C" : "#0f172a";

      if (mapboxMarkersRef.current[markerId]) {
        mapboxMarkersRef.current[markerId].setLngLat([delivery.lng, delivery.lat]);
      } else {
        const el = document.createElement("div");
        el.style.width = "28px";
        el.style.height = "28px";
        el.style.display = "flex";
        el.style.alignItems = "center";
        el.style.justifyContent = "center";
        el.style.backgroundColor = color;
        el.style.border = "2px solid white";
        el.style.borderRadius = "8px";
        el.style.boxShadow = "0 2px 10px rgba(0,0,0,0.3)";
        el.style.transform = "rotate(45deg)";
        el.style.cursor = "pointer";

        const inner = document.createElement("div");
        inner.style.transform = "rotate(-45deg)";
        inner.style.color = "white";
        inner.style.fontSize = "0.65rem";
        inner.style.fontWeight = "800";
        inner.innerHTML = "📦";
        el.appendChild(inner);

        const popup = new mapboxgl.Popup({ offset: 15 }).setHTML(`
          <div style="font-family: var(--font-family); color: #000; padding: 4px; min-width: 150px;">
            <strong style="font-size: 0.85rem;">Orden: ${delivery.customer}</strong><br/>
            <span style="font-size: 0.75rem;">${delivery.address}</span><br/>
            <p style="font-size: 0.7rem; margin-top: 4px;">Items: ${delivery.items}</p>
            <div style="margin-top: 6px; font-size: 0.75rem; font-weight:600; color: ${color}">
              Estatus: ${delivery.status === "pending" ? "Por Asignar" : "En Tránsito"}
            </div>
          </div>
        `);

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([delivery.lng, delivery.lat])
          .setPopup(popup)
          .addTo(map);

        mapboxMarkersRef.current[markerId] = marker;
      }
    });

    // Remove deleted deliveries
    Object.keys(mapboxMarkersRef.current).forEach((key) => {
      if (key.startsWith("delivery-")) {
        const id = key.replace("delivery-", "");
        const del = deliveries.find((d) => d.id === id);
        if (!del || del.status === "delivered" || del.status === "canceled") {
          mapboxMarkersRef.current[key].remove();
          delete mapboxMarkersRef.current[key];
        }
      }
    });

    // C. Draw Route Polylines in Mapbox
    drivers.forEach((driver) => {
      const sourceId = `route-source-${driver.id}`;
      const layerId = `route-layer-${driver.id}`;

      if (driver.status === "on_delivery" && driver.currentRoute.length > 0) {
        const remainingRoute = driver.currentRoute.slice(driver.routeIndex);
        const geojson = {
          type: "Feature" as const,
          properties: {},
          geometry: {
            type: "LineString" as const,
            // Mapbox is [lng, lat]
            coordinates: remainingRoute.map((coord) => [coord[1], coord[0]])
          }
        };

        const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
        if (source) {
          source.setData(geojson);
        } else {
          map.addSource(sourceId, {
            type: "geojson",
            data: geojson
          });

          map.addLayer({
            id: layerId,
            type: "line",
            source: sourceId,
            layout: {
              "line-join": "round",
              "line-cap": "round"
            },
            paint: {
              "line-color": driver.color,
              "line-width": 4,
              "line-dasharray": [2, 2],
              "line-opacity": 0.8
            }
          });
        }
      } else {
        // Clean up active layer if exist
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
        if (map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }
      }
    });

    // Render Selected Order Route in Mapbox GL
    const selectedOrder = orders.find(o => o.id === selectedOrderId);
    const branch = selectedOrder ? branches.find(b => b.id === selectedOrder.idSucursal) : null;
    const hasBranchCoords = branch && branch.lat !== null && branch.lat !== undefined && branch.lng !== null && branch.lng !== undefined;
    
    const startMarkerId = "selected-order-start";
    const endMarkerId = "selected-order-end";
    const orderSourceId = "selected-order-route-source";
    const orderLayerId = "selected-order-route-layer";

    if (selectedOrder && hasBranchCoords && selectedOrder.lat && selectedOrder.lng) {
      // Start Marker (Branch)
      if (mapboxMarkersRef.current[startMarkerId]) {
        mapboxMarkersRef.current[startMarkerId].setLngLat([branch.lng!, branch.lat!]);
      } else {
        const el = document.createElement("div");
        el.style.width = "16px";
        el.style.height = "16px";
        el.style.backgroundColor = "#0f172a";
        el.style.border = "3px solid white";
        el.style.borderRadius = "50%";
        el.style.boxShadow = "0 0 10px rgba(0,0,0,0.5)";
        
        mapboxMarkersRef.current[startMarkerId] = new mapboxgl.Marker({ element: el })
          .setLngLat([branch.lng!, branch.lat!])
          .addTo(map);
      }

      // End Marker (Destination)
      if (mapboxMarkersRef.current[endMarkerId]) {
        mapboxMarkersRef.current[endMarkerId].setLngLat([selectedOrder.lng!, selectedOrder.lat!]);
      } else {
        const el = document.createElement("div");
        el.style.width = "16px";
        el.style.height = "16px";
        el.style.backgroundColor = "#f7340c";
        el.style.border = "3px solid white";
        el.style.borderRadius = "50%";
        el.style.boxShadow = "0 0 10px #f7340c";
        
        mapboxMarkersRef.current[endMarkerId] = new mapboxgl.Marker({ element: el })
          .setLngLat([selectedOrder.lng!, selectedOrder.lat!])
          .addTo(map);
      }

      // Draw Route
      if (selectedOrderRoute.length > 0) {
        const geojson = {
          type: "Feature" as const,
          properties: {},
          geometry: {
            type: "LineString" as const,
            coordinates: selectedOrderRoute.map((coord) => [coord[1], coord[0]])
          }
        };

        const source = map.getSource(orderSourceId) as mapboxgl.GeoJSONSource | undefined;
        if (source) {
          source.setData(geojson);
        } else {
          map.addSource(orderSourceId, {
            type: "geojson",
            data: geojson
          });

          map.addLayer({
            id: orderLayerId,
            type: "line",
            source: orderSourceId,
            layout: {
              "line-join": "round",
              "line-cap": "round"
            },
            paint: {
              "line-color": "#f7340c",
              "line-width": 5,
              "line-opacity": 0.9
            }
          });
        }
      }

      // Auto fit bounds
      try {
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend([branch.lng!, branch.lat!]);
        bounds.extend([selectedOrder.lng!, selectedOrder.lat!]);
        map.fitBounds(bounds, { padding: 50 });
      } catch {}

    } else {
      // Clean up markers and route layers
      if (mapboxMarkersRef.current[startMarkerId]) {
        mapboxMarkersRef.current[startMarkerId].remove();
        delete mapboxMarkersRef.current[startMarkerId];
      }
      if (mapboxMarkersRef.current[endMarkerId]) {
        mapboxMarkersRef.current[endMarkerId].remove();
        delete mapboxMarkersRef.current[endMarkerId];
      }
      if (map.getLayer(orderLayerId)) {
        map.removeLayer(orderLayerId);
      }
      if (map.getSource(orderSourceId)) {
        map.removeSource(orderSourceId);
      }
    }
  };

  // 1. Initialize Map
  useEffect(() => {
    let active = true;
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    const initialize = async () => {
      // Clean up any existing map instances first
      cleanupMaps();

      const hasToken = settings.mapboxToken && settings.mapboxToken.trim().startsWith("pk.");

      if (hasToken) {
        // Initialize Mapbox GL
        try {
          if (active) setMapType("loading");
          const mapboxgl = (await import("mapbox-gl")).default;
          if (!active) return;
          mapboxLibRef.current = mapboxgl;
          mapboxgl.accessToken = settings.mapboxToken.trim();

          const map = new mapboxgl.Map({
            container: mapContainerRef.current!,
            style: "mapbox://styles/mapbox/light-v11",
            center: [mapCenterRef.current[1], mapCenterRef.current[0]], // Mapbox is [lng, lat]
            zoom: settings.mapZoom,
            attributionControl: false
          });

          map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-left");

          map.on("load", () => {
            if (active) {
              mapInstanceRef.current = map;
              setMapType("mapbox");
            }
          });
        } catch (err) {
          console.error("Error initializing Mapbox GL, falling back to Leaflet:", err);
          if (active) await initLeaflet();
        }
      } else {
        if (active) await initLeaflet();
      }
    };

    const initLeaflet = async () => {
      try {
        if (active) setMapType("loading");
        const L = (await import("leaflet")).default;
        if (!active) return;
        leafletLibRef.current = L;

        // Set up custom icon paths to prevent leaflet default image load errors
        delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png"
        });

        const map = L.map(mapContainerRef.current!, {
          zoomControl: false,
          attributionControl: false
        }).setView(mapCenterRef.current, settings.mapZoom);

        // Add custom zoom controls in top-left
        L.control.zoom({ position: "topleft" }).addTo(map);

        // Dark-mode themed CartoDB Voyager tiles
        L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
          maxZoom: 19
        }).addTo(map);

        if (active) {
          mapInstanceRef.current = map;
          setMapType("leaflet");
        }
      } catch (err) {
        console.error("Error initializing Leaflet map:", err);
      }
    };

    initialize();

    return () => {
      active = false;
      cleanupMaps();
    };
  }, [settings.mapboxToken, settings.mapZoom]);

  // 2. Update Markers & Polylines when drivers, deliveries, mapType, selectedOrderId, or selectedOrderRoute change
  useEffect(() => {
    if (!mapInstanceRef.current || mapType === "loading") return;

    if (mapType === "leaflet") {
      updateLeafletElements();
    } else if (mapType === "mapbox") {
      updateMapboxElements();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drivers, deliveries, mapType, selectedOrderId, selectedOrderRoute]);

  return (
    <div className={styles.mapWrapper}>
      {mapType === "loading" && (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>
            Iniciando Mapa Motorizado...
          </span>
        </div>
      )}

      {/* Map Target Element */}
      <div ref={mapContainerRef} className={styles.mapContainer} />

      {/* Floating Badges */}
      <div className={styles.overlay}>
        {mapType === "mapbox" ? (
          <div className={`${styles.badge} ${styles.mapboxBadge}`}>
            <Navigation size={12} className="pulsing-cyan" />
            Motor Vectorial: Mapbox GL
          </div>
        ) : mapType === "leaflet" ? (
          <div className={`${styles.badge} ${styles.leafletBadge}`}>
            <Layers size={12} />
            Motor Abierto: Leaflet Map
          </div>
        ) : null}
      </div>

      {/* Map Legend */}
      <div className={styles.legend}>
        <span className={styles.legendTitle}>Referencias</span>
        <div className={styles.legendItem}>
          <span className={styles.dot} style={{ background: "var(--primary)" }} />
          <span>Entrega en Curso</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.dot} style={{ background: "var(--warning)" }} />
          <span>Entrega Pendiente</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.dot} style={{ background: "var(--success)" }} />
          <span>Repartidor Disponible</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.dot} style={{ background: "var(--danger)" }} />
          <span>Repartidor Inactivo / Incidencia</span>
        </div>
      </div>
    </div>
  );
};
