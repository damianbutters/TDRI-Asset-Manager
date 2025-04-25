import { apiRequest, queryClient } from "./queryClient";
import type { 
  AssetType, 
  RoadwayAsset, 
  AssetInspection, 
  AssetMaintenanceRecord, 
  InsertAssetType,
  InsertRoadwayAsset,
  InsertAssetInspection,
  InsertAssetMaintenanceRecord 
} from "@shared/schema";

// Asset Types
export async function getAssetTypes(): Promise<AssetType[]> {
  const response = await apiRequest("GET", "/api/asset-types");
  return await response.json();
}

export async function getAssetType(id: number): Promise<AssetType> {
  const response = await apiRequest("GET", `/api/asset-types/${id}`);
  return await response.json();
}

export async function createAssetType(data: InsertAssetType): Promise<AssetType> {
  const response = await apiRequest("POST", "/api/asset-types", data);
  queryClient.invalidateQueries({ queryKey: ["/api/asset-types"] });
  return await response.json();
}

export async function updateAssetType(params: { id: number, data: Partial<InsertAssetType> }): Promise<AssetType> {
  const { id, data } = params;
  const response = await apiRequest("PUT", `/api/asset-types/${id}`, data);
  queryClient.invalidateQueries({ queryKey: ["/api/asset-types"] });
  queryClient.invalidateQueries({ queryKey: [`/api/asset-types/${id}`] });
  return await response.json();
}

export async function deleteAssetType(id: number): Promise<void> {
  await apiRequest("DELETE", `/api/asset-types/${id}`);
  queryClient.invalidateQueries({ queryKey: ["/api/asset-types"] });
}

// Roadway Assets
export async function getRoadwayAssets(): Promise<RoadwayAsset[]> {
  const response = await apiRequest("GET", "/api/roadway-assets");
  return await response.json();
}

export async function getRoadwayAssetsByType(assetTypeId: number): Promise<RoadwayAsset[]> {
  const response = await apiRequest("GET", `/api/asset-types/${assetTypeId}/assets`);
  return await response.json();
}

export async function getRoadwayAsset(id: number): Promise<RoadwayAsset> {
  const response = await apiRequest("GET", `/api/roadway-assets/${id}`);
  return await response.json();
}

export async function createRoadwayAsset(data: InsertRoadwayAsset): Promise<RoadwayAsset> {
  const response = await apiRequest("POST", "/api/roadway-assets", data);
  queryClient.invalidateQueries({ queryKey: ["/api/roadway-assets"] });
  return await response.json();
}

export async function updateRoadwayAsset(params: { id: number, data: Partial<InsertRoadwayAsset> }): Promise<RoadwayAsset> {
  const { id, data } = params;
  const response = await apiRequest("PUT", `/api/roadway-assets/${id}`, data);
  queryClient.invalidateQueries({ queryKey: ["/api/roadway-assets"] });
  queryClient.invalidateQueries({ queryKey: [`/api/roadway-assets/${id}`] });
  return await response.json();
}

export async function deleteRoadwayAsset(id: number): Promise<void> {
  await apiRequest("DELETE", `/api/roadway-assets/${id}`);
  queryClient.invalidateQueries({ queryKey: ["/api/roadway-assets"] });
}

// Asset Inspections
export async function getAssetInspections(): Promise<AssetInspection[]> {
  const response = await apiRequest("GET", "/api/asset-inspections");
  return await response.json();
}

export async function getAssetInspectionsByAsset(assetId: number): Promise<AssetInspection[]> {
  const response = await apiRequest("GET", `/api/roadway-assets/${assetId}/inspections`);
  return await response.json();
}

export async function createAssetInspection(data: InsertAssetInspection): Promise<AssetInspection> {
  const response = await apiRequest("POST", "/api/asset-inspections", data);
  queryClient.invalidateQueries({ queryKey: ["/api/asset-inspections"] });
  queryClient.invalidateQueries({ queryKey: [`/api/roadway-assets/${data.roadwayAssetId}/inspections`] });
  return await response.json();
}

// Asset Maintenance Records
export async function getAssetMaintenanceRecords(): Promise<AssetMaintenanceRecord[]> {
  const response = await apiRequest("GET", "/api/asset-maintenance-records");
  return await response.json();
}

export async function getAssetMaintenanceByAsset(assetId: number): Promise<AssetMaintenanceRecord[]> {
  const response = await apiRequest("GET", `/api/roadway-assets/${assetId}/maintenance`);
  return await response.json();
}

export async function createAssetMaintenanceRecord(data: InsertAssetMaintenanceRecord): Promise<AssetMaintenanceRecord> {
  const response = await apiRequest("POST", "/api/asset-maintenance-records", data);
  queryClient.invalidateQueries({ queryKey: ["/api/asset-maintenance-records"] });
  queryClient.invalidateQueries({ queryKey: [`/api/roadway-assets/${data.roadwayAssetId}/maintenance`] });
  return await response.json();
}

// Import/Export
export async function importRoadwayAssets(file: File): Promise<{ success: boolean; message: string; count: number }> {
  const formData = new FormData();
  formData.append("file", file);
  
  const response = await fetch("/api/import/roadway-assets", {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Import failed');
  }
  
  queryClient.invalidateQueries({ queryKey: ["/api/roadway-assets"] });
  return await response.json();
}

export async function exportRoadwayAssets(): Promise<Blob> {
  const response = await apiRequest("GET", "/api/export/roadway-assets");
  return await response.blob();
}