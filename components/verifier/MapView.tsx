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
  const clusterGroupRef = useRef<any>(null);

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

  // Update Markers with Clustering
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;

    // Remove existing cluster group if it exists
    if (clusterGroupRef.current) {
      mapInstanceRef.current.removeLayer(clusterGroupRef.current);
      clusterGroupRef.current = null;
    }

    // Initialize new cluster group
    // We can pass options here if we want custom styling for clusters
    clusterGroupRef.current = window.L.markerClusterGroup({
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 50,
    });

    // Add Markers to Cluster Group
    reports.forEach(report => {
      const color = report.status === ReportStatus.VERIFIED ? '#10b981' : 
                    report.status === ReportStatus.SPAM ? '#ef4444' : '#f59e0b';
      
      const markerHtml = `
        <div style="
          background-color: ${color};
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 2px solid ${isDarkMode ? '#fff' : '#000'};
          box-shadow: 0 0 10px ${color};
        "></div>
      `;

      const icon = window.L.divIcon({
        className: 'custom-marker',
        html: markerHtml,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      const marker = window.L.marker([report.location.latitude, report.location.longitude], { icon });

      // Add Tooltip (Hover)
      marker.bindTooltip(
        `
        <div class="font-sans text-xs">
          <span class="font-bold block mb-0.5 ${report.status === ReportStatus.VERIFIED ? 'text-emerald-600' : 'text-amber-600'}">
            ${report.status}
          </span>
          ${report.content.substring(0, 40)}${report.content.length > 40 ? '...' : ''}
        </div>
        `,
        {
          direction: 'top',
          offset: [0, -10],
          opacity: 0.9,
          className: isDarkMode ? 'dark-tooltip' : ''
        }
      );

      // Add Popup (Click)
      marker.bindPopup(`
          <div class="text-slate-900 p-1 min-w-[200px]">
            <div class="flex justify-between items-center mb-2">
               <strong class="text-xs uppercase px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300">${report.status}</strong>
               <span class="text-[10px] text-slate-500">${new Date(report.timestamp).toLocaleDateString()}</span>
            </div>
            <p class="text-xs leading-relaxed">${report.content.substring(0, 100)}...</p>
            <div class="mt-2 text-center text-xs text-emerald-600 font-medium">Click marker to view details</div>
          </div>
        `);
      
      // Handle Click Selection
      marker.on('click', () => {
        onSelectReport(report.id);
      });

      clusterGroupRef.current.addLayer(marker);
    });

    // Add the cluster group to the map
    mapInstanceRef.current.addLayer(clusterGroupRef.current);

  }, [reports, onSelectReport, isDarkMode]);

  return <div ref={mapContainerRef} className="w-full h-full bg-slate-100 dark:bg-slate-950 transition-colors duration-300" />;
};

// Add Leaflet type shim for window
declare global {
  interface Window {
    L: any;
  }
}