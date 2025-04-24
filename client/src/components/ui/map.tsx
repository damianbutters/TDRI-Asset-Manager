import { useEffect, useState } from "react";
import { 
  MapContainer, 
  TileLayer, 
  Polyline, 
  Popup, 
  useMap, 
  LayersControl,
  CircleMarker
} from "react-leaflet";
import L from "leaflet";
import { RoadAsset, MoistureReading, getConditionState } from "@shared/schema";
import { getConditionColor, getMoistureColor, getRelativeMoistureColor } from "@/lib/utils/color-utils";

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
  moistureReadings?: Record<number, MoistureReading[]>;
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

// Component for rendering moisture reading markers
function MoistureReadingsLayer({ readings }: { readings: Record<number, MoistureReading[]> }) {
  console.log("Moisture readings in layer:", readings);
  
  // Process each road's readings with its own min/max scale
  return (
    <>
      {Object.entries(readings).map(([roadAssetId, roadReadings]) => {
        // Calculate min and max moisture values for this road
        const moistureValues = roadReadings.map(r => r.moistureValue);
        const minMoisture = Math.min(...moistureValues);
        const maxMoisture = Math.max(...moistureValues);
        
        console.log(`Road ${roadAssetId} moisture range: ${minMoisture} to ${maxMoisture}`);
        
        return roadReadings.map(reading => {
          console.log("Rendering reading:", reading);
          
          // Use the relative color scale based on this road's min/max values
          const readingColor = getRelativeMoistureColor(
            reading.moistureValue, 
            minMoisture, 
            maxMoisture
          );
          
          // Additional info for popup
          const percentOfRange = maxMoisture === minMoisture 
            ? 0 
            : ((reading.moistureValue - minMoisture) / (maxMoisture - minMoisture) * 100).toFixed(1);
          
          return (
            <CircleMarker
              key={`moisture-point-${reading.id}`}
              center={[reading.latitude, reading.longitude]}
              radius={5}
              pathOptions={{
                color: readingColor,
                fillColor: readingColor,
                fillOpacity: 0.8,
                weight: 1,
              }}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-medium text-sm">Moisture Reading</h3>
                  <div className="flex flex-col gap-1 mt-1">
                    <p className="text-xs">
                      <span className="font-medium">Value:</span> {reading.moistureValue.toFixed(2)}%
                    </p>
                    <p className="text-xs">
                      <span className="font-medium">Range:</span> {minMoisture.toFixed(2)}% - {maxMoisture.toFixed(2)}%
                    </p>
                    <p className="text-xs">
                      <span className="font-medium">Relative:</span> {percentOfRange}% of range
                    </p>
                    <p className="text-xs">
                      <span className="font-medium">Date:</span> {new Date(reading.readingDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs">
                      <span className="font-medium">Coordinates:</span> {reading.latitude.toFixed(5)}, {reading.longitude.toFixed(5)}
                    </p>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        });
      })}
    </>
  );
}

export default function Map({ 
  roadAssets, 
  height = "h-80", 
  center = [40.7650, -73.9800], // Center on Midtown Manhattan
  zoom = 13, // Higher zoom to better see streets
  onAssetClick,
  initialLayer = "pci",
  moistureReadings = {}
}: MapProps) {
  const [selectedAsset, setSelectedAsset] = useState<RoadAsset | null>(null);
  const [activeLayer, setActiveLayer] = useState<"pci" | "moisture">(initialLayer);
  
  // Update activeLayer when initialLayer prop changes
  useEffect(() => {
    setActiveLayer(initialLayer);
  }, [initialLayer]);
  
  const handleAssetClick = (asset: RoadAsset) => {
    setSelectedAsset(asset);
    if (onAssetClick) {
      onAssetClick(asset);
    }
  };
  
  // Helper function to extract coordinates from a road asset
  const getCoordinates = (asset: RoadAsset): [number, number][] => {
    if (asset.geometry && typeof asset.geometry === 'object' && 'coordinates' in asset.geometry) {
      const coordinates = asset.geometry.coordinates as [number, number][];
      
      // Convert the coordinates to Leaflet's [lat, lng] format from GeoJSON's [lng, lat]
      return coordinates.map(coord => [coord[1], coord[0]]);
    }
    return [];
  };
  
  // Check if we have moisture readings
  const hasMoistureReadings = Object.keys(moistureReadings).length > 0;
  console.log("Has moisture readings:", hasMoistureReadings, Object.keys(moistureReadings).length);
  
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
      </LayersControl>
      
      {/* Display PCI layer if activeLayer is pci */}
      {activeLayer === "pci" && roadAssets.map((asset) => {
        const coordinates = getCoordinates(asset);
        if (coordinates.length === 0) return null;
        
        const conditionColor = getConditionColor(asset.condition);
        
        return (
          <Polyline
            key={`pci-${asset.id}`}
            positions={coordinates}
            pathOptions={{
              color: conditionColor,
              weight: 6,
              opacity: 0.9,
              lineCap: "round", 
              lineJoin: "round"
            }}
            eventHandlers={{
              click: () => handleAssetClick(asset)
            }}
          />
        );
      })}
      
      {/* Display Moisture layer if activeLayer is moisture */}
      {activeLayer === "moisture" && (
        <>
          {roadAssets.map((asset) => {
            const coordinates = getCoordinates(asset);
            if (coordinates.length === 0) return null;
            
            // Use the traffic light color scale for roads too
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
          
          {/* Render all the individual moisture reading markers */}
          {hasMoistureReadings && <MoistureReadingsLayer readings={moistureReadings} />}
        </>
      )}
      
      {/* Layer Toggle Control */}
      <div className="leaflet-top leaflet-left" style={{ top: '80px' }}>
        <div className="leaflet-control leaflet-bar bg-white p-2 shadow-md rounded-md">
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => setActiveLayer("pci")} 
              className={`px-2 py-1 text-xs rounded ${activeLayer === "pci" ? 'bg-primary text-white' : 'bg-gray-100'}`}
            >
              PCI View
            </button>
            <button 
              onClick={() => setActiveLayer("moisture")} 
              className={`px-2 py-1 text-xs rounded ${activeLayer === "moisture" ? 'bg-primary text-white' : 'bg-gray-100'}`}
            >
              Moisture View
            </button>
          </div>
        </div>
      </div>
      
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
