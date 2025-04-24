import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { RoadAsset, getConditionState } from "@shared/schema";
import { getConditionColor } from "@/lib/utils/color-utils";

interface MapProps {
  roadAssets: RoadAsset[];
  height?: string;
  center?: [number, number];
  zoom?: number;
  onAssetClick?: (asset: RoadAsset) => void;
}

function MapController({ roadAssets }: { roadAssets: RoadAsset[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (roadAssets.length > 0) {
      const bounds = new L.LatLngBounds([]);
      
      roadAssets.forEach(asset => {
        if (asset.geometry && asset.geometry.coordinates) {
          asset.geometry.coordinates.forEach(coord => {
            bounds.extend([coord[1], coord[0]]);
          });
        }
      });
      
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [map, roadAssets]);
  
  return null;
}

export default function Map({ 
  roadAssets, 
  height = "h-80", 
  center = [40, -74.5], 
  zoom = 9, 
  onAssetClick 
}: MapProps) {
  const [selectedAsset, setSelectedAsset] = useState<RoadAsset | null>(null);
  
  const handleAssetClick = (asset: RoadAsset) => {
    setSelectedAsset(asset);
    if (onAssetClick) {
      onAssetClick(asset);
    }
  };

  return (
    <MapContainer 
      className={`${height} w-full rounded-lg`} 
      center={center} 
      zoom={zoom} 
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapController roadAssets={roadAssets} />
      
      {roadAssets.map((asset) => {
        if (!asset.geometry || !asset.geometry.coordinates) return null;
        
        const conditionColor = getConditionColor(asset.condition);
        const coordinates = asset.geometry.coordinates.map(coord => [coord[1], coord[0]] as [number, number]);
        
        return (
          <Polyline
            key={asset.id}
            positions={coordinates}
            pathOptions={{
              color: conditionColor,
              weight: 5,
              opacity: 0.7
            }}
            eventHandlers={{
              click: () => handleAssetClick(asset)
            }}
          />
        );
      })}
      
      {selectedAsset && (
        <Popup
          position={[
            selectedAsset.geometry.coordinates[0][1],
            selectedAsset.geometry.coordinates[0][0]
          ]}
          onClose={() => setSelectedAsset(null)}
        >
          <div className="p-2">
            <h3 className="font-medium text-sm">{selectedAsset.name}</h3>
            <p className="text-xs text-gray-600">{selectedAsset.location}</p>
            <p className="text-xs">
              Condition: {getConditionState(selectedAsset.condition).toUpperCase()} ({selectedAsset.condition}/100)
            </p>
            <p className="text-xs">
              Last Inspection: {new Date(selectedAsset.lastInspection).toLocaleDateString()}
            </p>
            <button 
              onClick={() => onAssetClick && onAssetClick(selectedAsset)}
              className="text-xs text-primary hover:text-secondary mt-1"
            >
              View Details
            </button>
          </div>
        </Popup>
      )}
    </MapContainer>
  );
}
