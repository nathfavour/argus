import React, { useEffect, useRef } from "react";
import { Report, ReportStatus } from "../../types";

interface MapViewProps {
  reports: Report[];
  onSelectReport: (id: string) => void;
  isDarkMode: boolean;
}

export const MapView: React.FC<MapViewProps> = ({ reports, onSelectReport, isDarkMode }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null); // Using any to avoid strict Leaflet type dependencies in this setup
  const tileLayerRef = useRef<any>(null);

  // Initialize Map
  useEffect(() => {
    if (!window.L || !mapContainerRef.current || mapInstanceRef.current) return;

    // Default center (Central Nigeria approx)
    mapInstanceRef.current = window.L.map(mapContainerRef.current).setView([9.0820, 8.6753], 10);
  }, []);

  // Update Tile Layer when theme changes
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    const theme = isDarkMode ? 'dark_all' : 'light_all';
    
    tileLayerRef.current = window.L.tileLayer(`https://{s}.basemaps.cartocdn.com/${theme}/{z}/{x}/{y}{r}.png`, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(mapInstanceRef.current);

  }, [isDarkMode]);

  // Update Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;

    // Clear existing markers (except tile layer which is managed separately)
    mapInstanceRef.current.eachLayer((layer: any) => {
      if (layer instanceof window.L.Marker) {
        mapInstanceRef.current.removeLayer(layer);
      }
    });

    // Add Markers
    reports.forEach(report => {
      const color = report.status === ReportStatus.VERIFIED ? '#10b981' : 
                    report.status === ReportStatus.SPAM ? '#ef4444' : '#f59e0b';
      
      const markerHtml = `
        <div style="
          background-color: ${color};
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid ${isDarkMode ? '#fff' : '#000'};
          box-shadow: 0 0 10px ${color};
        "></div>
      `;

      const icon = window.L.divIcon({
        className: 'custom-marker',
        html: markerHtml,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      });

      const marker = window.L.marker([report.location.latitude, report.location.longitude], { icon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div class="text-slate-900 p-1">
            <strong class="block mb-1 text-xs uppercase">${report.status}</strong>
            <p class="text-xs line-clamp-2">${report.content.substring(0, 50)}...</p>
          </div>
        `);
      
      marker.on('click', () => {
        onSelectReport(report.id);
      });
    });
  }, [reports, onSelectReport, isDarkMode]);

  return <div ref={mapContainerRef} className="w-full h-full bg-slate-100 dark:bg-slate-950 transition-colors duration-300" />;
};

// Add Leaflet type shim for window
declare global {
  interface Window {
    L: any;
  }
}