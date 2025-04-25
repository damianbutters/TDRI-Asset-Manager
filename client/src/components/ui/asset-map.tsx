import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, LayersControl, Marker, Popup, Tooltip, Circle, Rectangle, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { AssetType, RoadwayAsset } from '@shared/schema';

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

export function getDynamicIcon(shape: string, color: string, size: number = 12): L.DivIcon {
  let svgPath = '';

  // Define shapes
  switch (shape) {
    case 'circle':
      // Circle is a simple circle centered at half the size
      svgPath = `<circle cx="${size/2}" cy="${size/2}" r="${size/2 - 1}" fill="${color}" stroke="#fff" stroke-width="1" />`;
      break;
    case 'square':
      // Square is a rectangle with equal sides
      svgPath = `<rect x="1" y="1" width="${size - 2}" height="${size - 2}" fill="${color}" stroke="#fff" stroke-width="1" />`;
      break;
    case 'triangle':
      // Triangle is an equilateral triangle pointing up
      svgPath = `<polygon points="${size/2},1 ${size-1},${size-1} 1,${size-1}" fill="${color}" stroke="#fff" stroke-width="1" />`;
      break;
    case 'diamond':
      // Diamond is a square rotated 45 degrees
      svgPath = `<polygon points="${size/2},1 ${size-1},${size/2} ${size/2},${size-1} 1,${size/2}" fill="${color}" stroke="#fff" stroke-width="1" />`;
      break;
    case 'star':
      // Star is a 5-pointed star
      const outerRadius = size / 2 - 1;
      const innerRadius = outerRadius / 2;
      const points = [];
      for (let i = 0; i < 10; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = Math.PI * i / 5;
        const x = size / 2 + radius * Math.sin(angle);
        const y = size / 2 - radius * Math.cos(angle);
        points.push(`${x},${y}`);
      }
      svgPath = `<polygon points="${points.join(' ')}" fill="${color}" stroke="#fff" stroke-width="1" />`;
      break;
    default:
      // Default to circle
      svgPath = `<circle cx="${size/2}" cy="${size/2}" r="${size/2 - 1}" fill="${color}" stroke="#fff" stroke-width="1" />`;
  }

  // Create SVG content with the path
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      ${svgPath}
    </svg>
  `;

  // Create a div icon with the SVG content
  return L.divIcon({
    html: svgIcon,
    className: 'custom-div-icon',
    iconSize: [size, size],
    iconAnchor: [size/2, size/2]
  });
}

interface AssetMapProps {
  assetTypes: AssetType[];
  assets: RoadwayAsset[];
  height?: string;
  enabledLayerIds?: number[];
  onLayersChange?: (enabledIds: number[]) => void;
}

export function AssetMap({ 
  assetTypes, 
  assets, 
  height = '500px',
  enabledLayerIds,
  onLayersChange
}: AssetMapProps) {
  const [map, setMap] = useState<L.Map | null>(null);
  const [internalEnabledLayers, setInternalEnabledLayers] = useState<number[]>(enabledLayerIds || []);

  // Define a type for the geometry
  type PointGeometry = {
    type: string;
    coordinates: number[];
  };

  // Get center coordinates for the map
  const getMapCenter = () => {
    // Look for assets with valid coordinates
    const assetsWithCoords = assets.filter(asset => {
      const geometry = asset.geometry as PointGeometry | undefined;
      if (geometry?.type === 'Point' && 
          Array.isArray(geometry.coordinates) && 
          geometry.coordinates.length === 2) {
        return true;
      }
      return false;
    });

    if (assetsWithCoords.length > 0) {
      // Use the first asset with coordinates as center
      const firstAsset = assetsWithCoords[0];
      const geometry = firstAsset.geometry as PointGeometry;
      return [geometry.coordinates[1], geometry.coordinates[0]]; // [lat, lng]
    }

    // Default to Mechanicsville, VA
    return [37.608, -77.373]; 
  };

  // Initialize map when enabled layers change
  useEffect(() => {
    if (enabledLayerIds && enabledLayerIds.length > 0) {
      setInternalEnabledLayers(enabledLayerIds);
    } else if (assetTypes.length > 0 && internalEnabledLayers.length === 0) {
      // By default, enable all asset type layers
      setInternalEnabledLayers(assetTypes.map(type => type.id));
    }
  }, [enabledLayerIds, assetTypes]);

  // Handle layer change events
  const handleLayerChange = (typeId: number, checked: boolean) => {
    const newEnabledLayers = checked 
      ? [...internalEnabledLayers, typeId]
      : internalEnabledLayers.filter(id => id !== typeId);
    
    setInternalEnabledLayers(newEnabledLayers);
    
    if (onLayersChange) {
      onLayersChange(newEnabledLayers);
    }
  };

  // Organize assets by type
  const assetsByType = assetTypes.reduce((acc, type) => {
    acc[type.id] = assets.filter(asset => asset.assetTypeId === type.id);
    return acc;
  }, {} as Record<number, RoadwayAsset[]>);

  return (
    <div style={{ height, width: '100%' }}>
      <MapContainer
        center={getMapCenter() as [number, number]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        whenReady={(mapEvent) => {
          if (mapEvent && mapEvent.target) {
            setMap(mapEvent.target);
          }
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <LayersControl position="topright">
          {assetTypes.map(type => (
            <LayersControl.Overlay 
              key={type.id} 
              name={type.name}
              checked={internalEnabledLayers.includes(type.id)}
            >
              <div className="map-layer-container">
                {assetsByType[type.id]?.map(asset => {
                  // Only show assets with valid coordinates
                  const geometry = asset.geometry as PointGeometry | undefined;
                  if (!geometry?.coordinates || 
                      !Array.isArray(geometry.coordinates) || 
                      geometry.coordinates.length !== 2) {
                    return null;
                  }

                  const position: [number, number] = [
                    geometry.coordinates[1], // Latitude
                    geometry.coordinates[0]  // Longitude
                  ];

                  // Use the asset type's map shape and color, or defaults
                  const shape = type.mapShape || 'circle';
                  const color = type.mapColor || '#3b82f6';
                  const icon = getDynamicIcon(shape, color, 24);

                  return (
                    <Marker 
                      key={asset.id} 
                      position={position}
                      icon={icon}
                      eventHandlers={{
                        add: () => {
                          if (internalEnabledLayers.includes(type.id)) {
                            handleLayerChange(type.id, true);
                          }
                        },
                        remove: () => {
                          if (!internalEnabledLayers.includes(type.id)) {
                            handleLayerChange(type.id, false);
                          }
                        }
                      }}
                    >
                      <Popup>
                        <div>
                          <h3 className="font-semibold">{asset.name}</h3>
                          <p className="text-sm text-gray-600">{asset.assetId}</p>
                          <p>{asset.description}</p>
                          <p className="mt-1">Location: {asset.location}</p>
                          <p>Condition: <span className={
                            asset.condition > 70 ? "text-green-600" :
                            asset.condition > 40 ? "text-yellow-600" : 
                            "text-red-600"
                          }>{asset.condition}</span></p>
                        </div>
                      </Popup>
                      <Tooltip>{asset.name}</Tooltip>
                    </Marker>
                  );
                })}
              </div>
            </LayersControl.Overlay>
          ))}
        </LayersControl>
      </MapContainer>
    </div>
  );
}