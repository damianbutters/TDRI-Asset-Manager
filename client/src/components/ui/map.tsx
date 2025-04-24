import { useEffect, useState, useRef } from "react";
import { 
  MapContainer, 
  TileLayer, 
  Polyline, 
  Marker, 
  Popup, 
  useMap, 
  LayersControl,
  Circle
} from "react-leaflet";
import L from "leaflet";
import { RoadAsset, getConditionState } from "@shared/schema";
import { getConditionColor, getMoistureColor } from "@/lib/utils/color-utils";

// Define the GeoJSON structure for TypeScript
interface Coordinates {
  type: string;
  coordinates: [number, number][];
}

interface MapProps {
  roadAssets: RoadAsset[];
  height?: string;
  center?: [number, number];
  zoom?: number;
  onAssetClick?: (asset: RoadAsset) => void;
  initialLayer?: "pci" | "moisture";
}

function MapController({ roadAssets }: { roadAssets: RoadAsset[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (roadAssets.length > 0) {
      const bounds = new L.LatLngBounds([]);
      
      roadAssets.forEach(asset => {
        if (asset.geometry && typeof asset.geometry === 'object' && 'coordinates' in asset.geometry) {
          const coordinates = asset.geometry.coordinates as [number, number][];
          coordinates.forEach(coord => {
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
  center = [40.7650, -73.9800], // Center on Midtown Manhattan
  zoom = 13, // Higher zoom to better see streets
  onAssetClick,
  initialLayer = "pci"
}: MapProps) {
  const [selectedAsset, setSelectedAsset] = useState<RoadAsset | null>(null);
  
  const handleAssetClick = (asset: RoadAsset) => {
    setSelectedAsset(asset);
    if (onAssetClick) {
      onAssetClick(asset);
    }
  };

  // Function to safely get coordinates from asset
  const getCoordinates = (asset: RoadAsset): [number, number][] => {
    if (asset.geometry && 
        typeof asset.geometry === 'object' && 
        'coordinates' in asset.geometry && 
        Array.isArray(asset.geometry.coordinates)) {
      return (asset.geometry.coordinates as [number, number][])
        .map(coord => [coord[1], coord[0]] as [number, number]);
    }
    return [];
  };

  return (
    <MapContainer 
      className={`${height} w-full rounded-lg`} 
      center={center} 
      zoom={zoom} 
      scrollWheelZoom={true}
    >
      <LayersControl position="topright">
        {/* Base Maps */}
        <LayersControl.BaseLayer checked name="OpenStreetMap">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>
        
        <LayersControl.BaseLayer name="Satellite">
          <TileLayer
            attribution='&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>
        
        <LayersControl.BaseLayer name="Topographic">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
        </LayersControl.BaseLayer>
        
        {/* Overlay for Road Conditions */}
        <LayersControl.Overlay checked={initialLayer === "pci"} name="Road Conditions (PCI)">
          <div>
            {roadAssets.map((asset) => {
              const coordinates = getCoordinates(asset);
              if (coordinates.length === 0) return null;
              
              const conditionColor = getConditionColor(asset.condition);
              
              return (
                <Polyline
                  key={asset.id}
                  positions={coordinates}
                  pathOptions={{
                    color: conditionColor,
                    weight: 6,        // Slightly thinner to match road width
                    opacity: 0.9,     // Higher opacity for better visibility
                    lineCap: "round", // Rounded line ends
                    lineJoin: "round" // Rounded corners
                  }}
                  eventHandlers={{
                    click: () => handleAssetClick(asset)
                  }}
                />
              );
            })}
          </div>
        </LayersControl.Overlay>
        
        {/* Overlay for Moisture Levels */}
        <LayersControl.Overlay checked={initialLayer === "moisture"} name="Moisture Levels">
          <div>
            {roadAssets.map((asset) => {
              const coordinates = getCoordinates(asset);
              if (coordinates.length === 0) return null;
              
              // Calculate the average coordinate for centering moisture indicators
              const moistureColor = getMoistureColor(asset.moistureLevel);
              
              return (
                <Polyline
                  key={`moisture-${asset.id}`}
                  positions={coordinates}
                  pathOptions={{
                    color: moistureColor,
                    weight: 6,
                    opacity: 0.8,
                    lineCap: "round", 
                    lineJoin: "round"
                  }}
                  eventHandlers={{
                    click: () => handleAssetClick(asset)
                  }}
                />
              );
            })}
          </div>
        </LayersControl.Overlay>
        
        {/* Overlay for Traffic Data (placeholder) */}
        <LayersControl.Overlay name="Traffic Volume">
          <div>
            {roadAssets.map((asset) => {
              const coordinates = getCoordinates(asset);
              if (coordinates.length === 0) return null;
              
              // This would normally use actual traffic data
              // Just for visualization, we're using random transparency
              const randomOpacity = Math.random() * 0.6 + 0.2;
              
              return (
                <Polyline
                  key={`traffic-${asset.id}`}
                  positions={coordinates}
                  pathOptions={{
                    color: "#3b82f6", // Blue
                    weight: 5,        // Slightly thinner than the condition overlay
                    opacity: randomOpacity,
                    lineCap: "round", // Rounded line ends
                    lineJoin: "round" // Rounded corners
                  }}
                />
              );
            })}
          </div>
        </LayersControl.Overlay>
      </LayersControl>
      
      <MapController roadAssets={roadAssets} />
      
      {selectedAsset && selectedAsset.geometry && 
        typeof selectedAsset.geometry === 'object' && 
        'coordinates' in selectedAsset.geometry && 
        Array.isArray(selectedAsset.geometry.coordinates) && 
        selectedAsset.geometry.coordinates.length > 0 && (
        <Popup
          position={[
            (selectedAsset.geometry.coordinates[0][1] as number),
            (selectedAsset.geometry.coordinates[0][0] as number)
          ]}
          eventHandlers={{
            popupclose: () => setSelectedAsset(null)
          }}
        >
          <div className="p-2">
            <h3 className="font-medium text-sm">{selectedAsset.name}</h3>
            <p className="text-xs text-gray-600">{selectedAsset.location}</p>
            <div className="flex flex-col gap-1 mt-1">
              <p className="text-xs">
                <span className="font-medium">Condition:</span> {getConditionState(selectedAsset.condition).toUpperCase()} ({selectedAsset.condition}/100)
              </p>
              <p className="text-xs">
                <span className="font-medium">Moisture:</span> {selectedAsset.moistureLevel !== null ? `${selectedAsset.moistureLevel.toFixed(1)}%` : 'Not measured'}
              </p>
              <p className="text-xs">
                <span className="font-medium">Last Inspection:</span> {new Date(selectedAsset.lastInspection).toLocaleDateString()}
              </p>
              {selectedAsset.lastMoistureReading && (
                <p className="text-xs">
                  <span className="font-medium">Last Moisture Reading:</span> {new Date(selectedAsset.lastMoistureReading).toLocaleDateString()}
                </p>
              )}
            </div>
            <button 
              onClick={() => onAssetClick && onAssetClick(selectedAsset)}
              className="text-xs text-primary hover:text-secondary mt-2"
            >
              View Details
            </button>
          </div>
        </Popup>
      )}
    </MapContainer>
  );
}
