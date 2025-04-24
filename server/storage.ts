import {
  users, User, InsertUser,
  roadAssets, RoadAsset, InsertRoadAsset,
  maintenanceTypes, MaintenanceType, InsertMaintenanceType,
  maintenanceProjects, MaintenanceProject, InsertMaintenanceProject,
  policies, Policy, InsertPolicy,
  budgetAllocations, BudgetAllocation, InsertBudgetAllocation,
  auditLogs, AuditLog, InsertAuditLog
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Road asset operations
  getRoadAssets(): Promise<RoadAsset[]>;
  getRoadAsset(id: number): Promise<RoadAsset | undefined>;
  getRoadAssetByAssetId(assetId: string): Promise<RoadAsset | undefined>;
  createRoadAsset(asset: InsertRoadAsset): Promise<RoadAsset>;
  updateRoadAsset(id: number, asset: Partial<InsertRoadAsset>): Promise<RoadAsset | undefined>;
  deleteRoadAsset(id: number): Promise<boolean>;
  
  // Maintenance type operations
  getMaintenanceTypes(): Promise<MaintenanceType[]>;
  getMaintenanceType(id: number): Promise<MaintenanceType | undefined>;
  createMaintenanceType(type: InsertMaintenanceType): Promise<MaintenanceType>;
  updateMaintenanceType(id: number, type: Partial<InsertMaintenanceType>): Promise<MaintenanceType | undefined>;
  deleteMaintenanceType(id: number): Promise<boolean>;
  
  // Maintenance project operations
  getMaintenanceProjects(): Promise<MaintenanceProject[]>;
  getMaintenanceProject(id: number): Promise<MaintenanceProject | undefined>;
  createMaintenanceProject(project: InsertMaintenanceProject): Promise<MaintenanceProject>;
  updateMaintenanceProject(id: number, project: Partial<InsertMaintenanceProject>): Promise<MaintenanceProject | undefined>;
  deleteMaintenanceProject(id: number): Promise<boolean>;
  
  // Policy operations
  getPolicies(): Promise<Policy[]>;
  getPolicy(id: number): Promise<Policy | undefined>;
  createPolicy(policy: InsertPolicy): Promise<Policy>;
  updatePolicy(id: number, policy: Partial<InsertPolicy>): Promise<Policy | undefined>;
  deletePolicy(id: number): Promise<boolean>;
  
  // Budget allocation operations
  getBudgetAllocations(): Promise<BudgetAllocation[]>;
  getBudgetAllocation(id: number): Promise<BudgetAllocation | undefined>;
  getActiveBudgetAllocation(): Promise<BudgetAllocation | undefined>;
  createBudgetAllocation(budget: InsertBudgetAllocation): Promise<BudgetAllocation>;
  updateBudgetAllocation(id: number, budget: Partial<InsertBudgetAllocation>): Promise<BudgetAllocation | undefined>;
  setBudgetAllocationActive(id: number): Promise<BudgetAllocation | undefined>;
  deleteBudgetAllocation(id: number): Promise<boolean>;
  
  // Audit log operations
  getAuditLogs(): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private roadAssets: Map<number, RoadAsset>;
  private maintenanceTypes: Map<number, MaintenanceType>;
  private maintenanceProjects: Map<number, MaintenanceProject>;
  private policies: Map<number, Policy>;
  private budgetAllocations: Map<number, BudgetAllocation>;
  private auditLogs: Map<number, AuditLog>;
  
  private userIdCounter: number;
  private roadAssetIdCounter: number;
  private maintenanceTypeIdCounter: number;
  private maintenanceProjectIdCounter: number;
  private policyIdCounter: number;
  private budgetAllocationIdCounter: number;
  private auditLogIdCounter: number;
  
  constructor() {
    this.users = new Map();
    this.roadAssets = new Map();
    this.maintenanceTypes = new Map();
    this.maintenanceProjects = new Map();
    this.policies = new Map();
    this.budgetAllocations = new Map();
    this.auditLogs = new Map();
    
    this.userIdCounter = 1;
    this.roadAssetIdCounter = 1;
    this.maintenanceTypeIdCounter = 1;
    this.maintenanceProjectIdCounter = 1;
    this.policyIdCounter = 1;
    this.budgetAllocationIdCounter = 1;
    this.auditLogIdCounter = 1;
    
    this.initializeData();
  }
  
  // Initialize with some default data
  private initializeData() {
    // Create a default user
    this.createUser({
      username: "admin",
      password: "admin123", // In a real app, this would be hashed
      fullName: "John Rodriguez",
      role: "Road Manager",
    });
    
    // Create default maintenance types
    this.createMaintenanceType({
      name: "Crack Sealing",
      description: "Sealing cracks with asphalt emulsion to prevent water intrusion",
      lifespanExtension: 2,
      conditionImprovement: 5,
      costPerMile: 3000,
      applicableMinCondition: 60,
      applicableMaxCondition: 100
    });
    
    this.createMaintenanceType({
      name: "Surface Treatment",
      description: "Application of a thin surface treatment to preserve the pavement",
      lifespanExtension: 5,
      conditionImprovement: 10,
      costPerMile: 30000,
      applicableMinCondition: 50,
      applicableMaxCondition: 80
    });
    
    this.createMaintenanceType({
      name: "Mill & Overlay",
      description: "Milling the existing surface and applying a new layer of asphalt",
      lifespanExtension: 10,
      conditionImprovement: 25,
      costPerMile: 135000,
      applicableMinCondition: 30,
      applicableMaxCondition: 60
    });
    
    this.createMaintenanceType({
      name: "Reconstruction",
      description: "Complete removal and replacement of the road structure",
      lifespanExtension: 20,
      conditionImprovement: 100,
      costPerMile: 500000,
      applicableMinCondition: 0,
      applicableMaxCondition: 40
    });
    
    // Create default budget allocation
    this.createBudgetAllocation({
      name: "FY 2023 Budget",
      description: "Fiscal Year 2023 Road Asset Budget",
      fiscalYear: 2023,
      totalBudget: 24800000,
      preventiveMaintenance: 8200000,
      minorRehabilitation: 6500000,
      majorRehabilitation: 5300000,
      reconstruction: 4800000,
      createdBy: 1,
      active: true
    });
    
    // Create some sample road assets
    const now = new Date();
    
    // Main Street - Good condition
    this.createRoadAsset({
      assetId: "RS-1024",
      name: "Main Street",
      location: "Downtown",
      length: 2.4,
      width: 24,
      surfaceType: "Asphalt",
      condition: 87,
      lastInspection: now,
      nextInspection: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
      geometry: {
        type: "LineString",
        coordinates: [
          [-74.501, 40.002],
          [-74.500, 40.004],
          [-74.498, 40.008],
          [-74.497, 40.012],
          [-74.496, 40.018]
        ]
      },
    });
    
    // Oak Avenue - Fair condition
    this.createRoadAsset({
      assetId: "RS-0872",
      name: "Oak Avenue",
      location: "Westside",
      length: 1.2,
      width: 22,
      surfaceType: "Asphalt",
      condition: 65,
      lastInspection: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 4),
      nextInspection: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate() - 4),
      geometry: {
        type: "LineString",
        coordinates: [
          [-74.508, 40.010],
          [-74.506, 40.012],
          [-74.504, 40.014],
          [-74.502, 40.015],
          [-74.498, 40.016]
        ]
      },
    });
    
    // River Road - Poor condition 
    this.createRoadAsset({
      assetId: "RS-1543",
      name: "River Road",
      location: "Riverside District",
      length: 2.6,
      width: 20,
      surfaceType: "Asphalt",
      condition: 48,
      lastInspection: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7),
      nextInspection: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate() - 7),
      geometry: {
        type: "LineString",
        coordinates: [
          [-74.490, 39.996],
          [-74.488, 39.998],
          [-74.486, 40.000],
          [-74.484, 40.002],
          [-74.482, 40.003],
          [-74.480, 40.004]
        ]
      },
    });
    
    // Commerce Way - Critical condition
    this.createRoadAsset({
      assetId: "RS-0932",
      name: "Commerce Way",
      location: "Industrial District",
      length: 3.1,
      width: 26,
      surfaceType: "Concrete",
      condition: 34,
      lastInspection: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 12),
      nextInspection: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate() - 12),
      geometry: {
        type: "LineString",
        coordinates: [
          [-74.510, 40.025],
          [-74.508, 40.026],
          [-74.505, 40.027],
          [-74.502, 40.028],
          [-74.498, 40.029],
          [-74.495, 40.030]
        ]
      },
    });
    
    // Highland Drive - Good condition
    this.createRoadAsset({
      assetId: "RS-1128",
      name: "Highland Drive",
      location: "Eastside",
      length: 2.4,
      width: 24,
      surfaceType: "Asphalt",
      condition: 82,
      lastInspection: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 17),
      nextInspection: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate() - 17),
      geometry: {
        type: "LineString",
        coordinates: [
          [-74.492, 40.012],
          [-74.490, 40.014],
          [-74.488, 40.016],
          [-74.486, 40.018]
        ]
      },
    });
    
    // Maple Boulevard - Fair condition (forms a loop)
    this.createRoadAsset({
      assetId: "RS-3392",
      name: "Maple Boulevard",
      location: "Midtown",
      length: 1.5,
      width: 26,
      surfaceType: "Asphalt",
      condition: 72,
      lastInspection: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 8),
      nextInspection: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate() - 8),
      geometry: {
        type: "LineString",
        coordinates: [
          [-74.496, 40.006],
          [-74.494, 40.007],
          [-74.492, 40.008],
          [-74.490, 40.008],
          [-74.490, 40.006],
          [-74.492, 40.004],
          [-74.495, 40.004],
          [-74.496, 40.006]
        ]
      },
    });
    
    // Create some maintenance projects
    this.createMaintenanceProject({
      projectId: "PR-2023-042",
      roadAssetId: 3,
      maintenanceTypeId: 3,
      status: "Planned",
      scheduledDate: new Date(now.getFullYear(), now.getMonth() + 1, 15),
      cost: 351000,
      notes: "Mill & Overlay for River Road",
      updatedBy: 1
    });
    
    // Create some policies
    this.createPolicy({
      name: "Preventive Maintenance for Asphalt",
      description: "Apply preventive maintenance for asphalt roads",
      surfaceType: "Asphalt",
      conditionThreshold: 75,
      maintenanceTypeId: 1,
      priority: 1,
      active: true
    });
    
    this.createPolicy({
      name: "Minor Rehabilitation for Asphalt",
      description: "Apply minor rehabilitation for asphalt roads",
      surfaceType: "Asphalt",
      conditionThreshold: 60,
      maintenanceTypeId: 2,
      priority: 2,
      active: true
    });
    
    this.createPolicy({
      name: "Major Rehabilitation for Asphalt",
      description: "Apply major rehabilitation for asphalt roads",
      surfaceType: "Asphalt",
      conditionThreshold: 45,
      maintenanceTypeId: 3,
      priority: 3,
      active: true
    });
    
    this.createPolicy({
      name: "Reconstruction for Asphalt",
      description: "Apply reconstruction for asphalt roads",
      surfaceType: "Asphalt",
      conditionThreshold: 30,
      maintenanceTypeId: 4,
      priority: 4,
      active: true
    });
    
    // Add some audit logs
    this.createAuditLog({
      userId: 1,
      username: "admin",
      action: "Updated asset condition",
      details: "RS-1024: Condition updated from 82 to 87",
      ipAddress: "192.168.1.45",
      resourceType: "road_asset",
      resourceId: "1"
    });
    
    this.createAuditLog({
      userId: 1,
      username: "admin",
      action: "Created maintenance project",
      details: "PR-2023-042: Mill & Overlay for River Road (Mile 3.2-5.8)",
      ipAddress: "192.168.1.22",
      resourceType: "maintenance_project",
      resourceId: "1"
    });
    
    this.createAuditLog({
      userId: 1,
      username: "admin",
      action: "Modified budget allocation",
      details: "Reallocated $1.2M from Reconstruction to Preventive Maintenance",
      ipAddress: "192.168.1.45",
      resourceType: "budget_allocation",
      resourceId: "1"
    });
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Road asset methods
  async getRoadAssets(): Promise<RoadAsset[]> {
    return Array.from(this.roadAssets.values());
  }
  
  async getRoadAsset(id: number): Promise<RoadAsset | undefined> {
    return this.roadAssets.get(id);
  }
  
  async getRoadAssetByAssetId(assetId: string): Promise<RoadAsset | undefined> {
    return Array.from(this.roadAssets.values()).find(
      (asset) => asset.assetId === assetId,
    );
  }
  
  async createRoadAsset(asset: InsertRoadAsset): Promise<RoadAsset> {
    const id = this.roadAssetIdCounter++;
    const now = new Date();
    const roadAsset: RoadAsset = { 
      ...asset, 
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.roadAssets.set(id, roadAsset);
    return roadAsset;
  }
  
  async updateRoadAsset(id: number, asset: Partial<InsertRoadAsset>): Promise<RoadAsset | undefined> {
    const existingAsset = this.roadAssets.get(id);
    if (!existingAsset) return undefined;
    
    const updatedAsset: RoadAsset = {
      ...existingAsset,
      ...asset,
      updatedAt: new Date()
    };
    
    this.roadAssets.set(id, updatedAsset);
    return updatedAsset;
  }
  
  async deleteRoadAsset(id: number): Promise<boolean> {
    return this.roadAssets.delete(id);
  }
  
  // Maintenance type methods
  async getMaintenanceTypes(): Promise<MaintenanceType[]> {
    return Array.from(this.maintenanceTypes.values());
  }
  
  async getMaintenanceType(id: number): Promise<MaintenanceType | undefined> {
    return this.maintenanceTypes.get(id);
  }
  
  async createMaintenanceType(type: InsertMaintenanceType): Promise<MaintenanceType> {
    const id = this.maintenanceTypeIdCounter++;
    const maintenanceType: MaintenanceType = { ...type, id };
    this.maintenanceTypes.set(id, maintenanceType);
    return maintenanceType;
  }
  
  async updateMaintenanceType(id: number, type: Partial<InsertMaintenanceType>): Promise<MaintenanceType | undefined> {
    const existingType = this.maintenanceTypes.get(id);
    if (!existingType) return undefined;
    
    const updatedType: MaintenanceType = {
      ...existingType,
      ...type
    };
    
    this.maintenanceTypes.set(id, updatedType);
    return updatedType;
  }
  
  async deleteMaintenanceType(id: number): Promise<boolean> {
    return this.maintenanceTypes.delete(id);
  }
  
  // Maintenance project methods
  async getMaintenanceProjects(): Promise<MaintenanceProject[]> {
    return Array.from(this.maintenanceProjects.values());
  }
  
  async getMaintenanceProject(id: number): Promise<MaintenanceProject | undefined> {
    return this.maintenanceProjects.get(id);
  }
  
  async createMaintenanceProject(project: InsertMaintenanceProject): Promise<MaintenanceProject> {
    const id = this.maintenanceProjectIdCounter++;
    const now = new Date();
    const maintenanceProject: MaintenanceProject = { 
      ...project, 
      id, 
      createdAt: now
    };
    this.maintenanceProjects.set(id, maintenanceProject);
    return maintenanceProject;
  }
  
  async updateMaintenanceProject(id: number, project: Partial<InsertMaintenanceProject>): Promise<MaintenanceProject | undefined> {
    const existingProject = this.maintenanceProjects.get(id);
    if (!existingProject) return undefined;
    
    const updatedProject: MaintenanceProject = {
      ...existingProject,
      ...project
    };
    
    this.maintenanceProjects.set(id, updatedProject);
    return updatedProject;
  }
  
  async deleteMaintenanceProject(id: number): Promise<boolean> {
    return this.maintenanceProjects.delete(id);
  }
  
  // Policy methods
  async getPolicies(): Promise<Policy[]> {
    return Array.from(this.policies.values());
  }
  
  async getPolicy(id: number): Promise<Policy | undefined> {
    return this.policies.get(id);
  }
  
  async createPolicy(policy: InsertPolicy): Promise<Policy> {
    const id = this.policyIdCounter++;
    const now = new Date();
    const newPolicy: Policy = { 
      ...policy, 
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.policies.set(id, newPolicy);
    return newPolicy;
  }
  
  async updatePolicy(id: number, policy: Partial<InsertPolicy>): Promise<Policy | undefined> {
    const existingPolicy = this.policies.get(id);
    if (!existingPolicy) return undefined;
    
    const updatedPolicy: Policy = {
      ...existingPolicy,
      ...policy,
      updatedAt: new Date()
    };
    
    this.policies.set(id, updatedPolicy);
    return updatedPolicy;
  }
  
  async deletePolicy(id: number): Promise<boolean> {
    return this.policies.delete(id);
  }
  
  // Budget allocation methods
  async getBudgetAllocations(): Promise<BudgetAllocation[]> {
    return Array.from(this.budgetAllocations.values());
  }
  
  async getBudgetAllocation(id: number): Promise<BudgetAllocation | undefined> {
    return this.budgetAllocations.get(id);
  }
  
  async getActiveBudgetAllocation(): Promise<BudgetAllocation | undefined> {
    return Array.from(this.budgetAllocations.values()).find(
      (budget) => budget.active
    );
  }
  
  async createBudgetAllocation(budget: InsertBudgetAllocation): Promise<BudgetAllocation> {
    const id = this.budgetAllocationIdCounter++;
    const now = new Date();
    const budgetAllocation: BudgetAllocation = { 
      ...budget, 
      id, 
      createdAt: now
    };
    this.budgetAllocations.set(id, budgetAllocation);
    return budgetAllocation;
  }
  
  async updateBudgetAllocation(id: number, budget: Partial<InsertBudgetAllocation>): Promise<BudgetAllocation | undefined> {
    const existingBudget = this.budgetAllocations.get(id);
    if (!existingBudget) return undefined;
    
    const updatedBudget: BudgetAllocation = {
      ...existingBudget,
      ...budget
    };
    
    this.budgetAllocations.set(id, updatedBudget);
    return updatedBudget;
  }
  
  async setBudgetAllocationActive(id: number): Promise<BudgetAllocation | undefined> {
    // Set all budgets to inactive
    for (const budget of this.budgetAllocations.values()) {
      budget.active = false;
    }
    
    // Set the specified budget to active
    const budget = this.budgetAllocations.get(id);
    if (!budget) return undefined;
    
    budget.active = true;
    return budget;
  }
  
  async deleteBudgetAllocation(id: number): Promise<boolean> {
    return this.budgetAllocations.delete(id);
  }
  
  // Audit log methods
  async getAuditLogs(): Promise<AuditLog[]> {
    return Array.from(this.auditLogs.values()).sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
  }
  
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const id = this.auditLogIdCounter++;
    const now = new Date();
    const auditLog: AuditLog = { 
      ...log, 
      id, 
      timestamp: now
    };
    this.auditLogs.set(id, auditLog);
    return auditLog;
  }
}

export const storage = new MemStorage();
