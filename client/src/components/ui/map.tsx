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

// Define types for moisture range modes
type MoistureRangeMode = "local" | "global";

// Type for global moisture thresholds
interface MoistureThresholds {
  low: number;
  medium: number;
  high: number;
}

// Component for rendering moisture reading markers
function MoistureReadingsLayer({ 
  readings, 
  rangeMode, 
  thresholds 
}: { 
  readings: Record<number, MoistureReading[]>;
  rangeMode: MoistureRangeMode;
  thresholds: MoistureThresholds;
}) {
  console.log("Moisture readings in layer:", readings, "Range mode:", rangeMode);
  
  // Process readings based on selected range mode
  return (
    <>
      {Object.entries(readings).map(([roadAssetId, roadReadings]) => {
        // Calculate min and max moisture values for this road (used in local mode)
        let minMoisture = 0;
        let maxMoisture = 0;
        
        if (rangeMode === "local") {
          const moistureValues = roadReadings.map(r => r.moistureValue);
          minMoisture = Math.min(...moistureValues);
          maxMoisture = Math.max(...moistureValues);
          console.log(`Road ${roadAssetId} moisture range: ${minMoisture} to ${maxMoisture}`);
        }
        
        return roadReadings.map(reading => {
          console.log("Rendering reading:", reading);
          
          // Choose color based on range mode
          let readingColor: string;
          let rangeInfo: React.ReactNode;
          
          if (rangeMode === "local") {
            // Local mode uses per-road min/max
            readingColor = getRelativeMoistureColor(
              reading.moistureValue, 
              minMoisture, 
              maxMoisture
            );
            
            // Calculate percentage within range for local mode
            const percentOfRange = maxMoisture === minMoisture 
              ? 0 
              : ((reading.moistureValue - minMoisture) / (maxMoisture - minMoisture) * 100).toFixed(1);
              
            rangeInfo = (
              <>
                <p className="text-xs">
                  <span className="font-medium">Road Range:</span> {minMoisture.toFixed(2)}% - {maxMoisture.toFixed(2)}%
                </p>
                <p className="text-xs">
                  <span className="font-medium">Relative:</span> {percentOfRange}% of range
                </p>
              </>
            );
          } else {
            // Global mode uses user-defined thresholds
            readingColor = getMoistureColor(reading.moistureValue, thresholds);
            
            // Show threshold info for global mode
            rangeInfo = (
              <p className="text-xs">
                <span className="font-medium">Thresholds:</span> Low: {thresholds.low}%, Med: {thresholds.medium}%, High: {thresholds.high}%
              </p>
            );
          }
          
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
                      <span className="font-medium">Mode:</span> {rangeMode === "local" ? "Local (per-street)" : "Global (fixed thresholds)"}
                    </p>
                    {rangeInfo}
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
  
  // Add moisture range mode and threshold settings
  const [moistureRangeMode, setMoistureRangeMode] = useState<MoistureRangeMode>("local");
  const [showThresholdSettings, setShowThresholdSettings] = useState(false);
  const [moistureThresholds, setMoistureThresholds] = useState<MoistureThresholds>({
    low: 8,
    medium: 15,
    high: 25
  });
  
  // Input fields for threshold settings
  const [lowThreshold, setLowThreshold] = useState(moistureThresholds.low.toString());
  const [mediumThreshold, setMediumThreshold] = useState(moistureThresholds.medium.toString());
  const [highThreshold, setHighThreshold] = useState(moistureThresholds.high.toString());
  
  // Update thresholds when input fields change
  const updateThresholds = () => {
    const low = parseFloat(lowThreshold);
    const medium = parseFloat(mediumThreshold);
    const high = parseFloat(highThreshold);
    
    // Validate numbers
    if (isNaN(low) || isNaN(medium) || isNaN(high)) {
      return; // Don't update if values are not valid numbers
    }
    
    // Validate ranges (low < medium < high)
    if (low >= medium || medium >= high) {
      return; // Don't update if ranges are invalid
    }
    
    setMoistureThresholds({
      low,
      medium,
      high
    });
  };
  
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
            
            // Choose color based on range mode
            const moistureColor = moistureRangeMode === "global" 
              ? getMoistureColor(asset.moistureLevel, moistureThresholds)
              : getMoistureColor(asset.moistureLevel); // Use default for "local" mode for the roads
            
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
          {hasMoistureReadings && (
            <MoistureReadingsLayer 
              readings={moistureReadings} 
              rangeMode={moistureRangeMode} 
              thresholds={moistureThresholds} 
            />
          )}
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
            
            {/* Only show moisture options when in moisture view */}
            {activeLayer === "moisture" && (
              <>
                <div className="h-px bg-gray-200 my-1"></div>
                
                <div className="text-xs font-medium mb-1">Moisture Range Mode:</div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => setMoistureRangeMode("local")} 
                    className={`px-2 py-1 text-xs rounded flex-1 ${moistureRangeMode === "local" ? 'bg-primary text-white' : 'bg-gray-100'}`}
                  >
                    Local
                  </button>
                  <button 
                    onClick={() => setMoistureRangeMode("global")} 
                    className={`px-2 py-1 text-xs rounded flex-1 ${moistureRangeMode === "global" ? 'bg-primary text-white' : 'bg-gray-100'}`}
                  >
                    Global
                  </button>
                </div>
                
                {/* Show threshold settings button when in global mode */}
                {moistureRangeMode === "global" && (
                  <button 
                    onClick={() => setShowThresholdSettings(!showThresholdSettings)} 
                    className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
                  >
                    {showThresholdSettings ? "Hide Thresholds" : "Set Thresholds"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Global Threshold Settings Panel */}
      {activeLayer === "moisture" && 
       moistureRangeMode === "global" && 
       showThresholdSettings && (
        <div className="leaflet-bottom leaflet-left" style={{ bottom: '20px', left: '20px' }}>
          <div className="leaflet-control leaflet-bar bg-white p-3 shadow-md rounded-md">
            <div className="flex flex-col gap-2 min-w-[250px]">
              <h3 className="text-sm font-medium">Global Moisture Thresholds</h3>
              <div className="text-xs text-gray-500 mb-2">Set threshold values for the global range mode</div>
              
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs">Low Threshold:</label>
                  <input 
                    type="number" 
                    value={lowThreshold} 
                    onChange={(e) => setLowThreshold(e.target.value)}
                    className="w-20 text-xs p-1 border rounded" 
                    min="0" 
                    max={mediumThreshold}
                    step="0.1"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-xs">Medium Threshold:</label>
                  <input 
                    type="number" 
                    value={mediumThreshold} 
                    onChange={(e) => setMediumThreshold(e.target.value)}
                    className="w-20 text-xs p-1 border rounded" 
                    min={lowThreshold} 
                    max={highThreshold}
                    step="0.1"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-xs">High Threshold:</label>
                  <input 
                    type="number" 
                    value={highThreshold} 
                    onChange={(e) => setHighThreshold(e.target.value)}
                    className="w-20 text-xs p-1 border rounded" 
                    min={mediumThreshold}
                    step="0.1"
                  />
                </div>
              </div>
              
              <div className="flex justify-between mt-2">
                <button 
                  onClick={() => setShowThresholdSettings(false)} 
                  className="px-3 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button 
                  onClick={updateThresholds} 
                  className="px-3 py-1 text-xs rounded bg-primary text-white hover:bg-primary/90"
                >
                  Apply
                </button>
              </div>
              
              <div className="flex justify-between mt-2 items-center">
                <span className="text-xs font-medium" style={{ color: '#00CC00' }}>Low</span>
                <span className="text-xs font-medium" style={{ color: '#FFCC00' }}>Medium</span>
                <span className="text-xs font-medium" style={{ color: '#FF8C00' }}>High</span>
                <span className="text-xs font-medium" style={{ color: '#E60000' }}>Very High</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
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
