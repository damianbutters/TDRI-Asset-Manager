import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Pencil, Trash, Plus, Loader2 } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

interface User {
  id: number;
  username: string;
  fullName: string;
  role: string;
  isSystemAdmin: boolean | null;
  currentTenantId: number | null;
}

interface Tenant {
  id: number;
  name: string;
  description: string | null;
  code: string;
}

interface UserTenant {
  id: number;
  userId: number;
  tenantId: number;
  role: string;
  isAdmin: boolean;
}

interface UserFormData {
  username: string;
  password: string;
  fullName: string;
  role: string;
  isSystemAdmin: boolean;
  tenantAccess: {
    tenantId: number;
    role: string;
    isAdmin: boolean;
  }[];
}

const UserManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    username: "",
    password: "",
    fullName: "",
    role: "user",
    isSystemAdmin: false,
    tenantAccess: [],
  });

  // Fetch users
  const { data: users = [], isLoading: isUsersLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
    retry: false,
  });

  // Fetch tenants
  const { data: tenants = [], isLoading: isTenantsLoading } = useQuery<Tenant[]>({
    queryKey: ['/api/tenants'],
  });

  // Fetch user-tenant relationships
  const { data: userTenants = [], isLoading: isUserTenantsLoading } = useQuery<UserTenant[]>({
    queryKey: ['/api/user-tenants'],
    retry: false,
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      // First create the user
      const userResponse = await apiRequest("POST", "/api/users", {
        username: data.username,
        password: data.password,
        fullName: data.fullName,
        role: data.role,
        isSystemAdmin: data.isSystemAdmin,
      });
      
      const user = await userResponse.json();
      
      // Then create tenant associations
      for (const tenantAccess of data.tenantAccess) {
        await apiRequest("POST", "/api/user-tenants", {
          userId: user.id,
          tenantId: tenantAccess.tenantId,
          role: tenantAccess.role,
          isAdmin: tenantAccess.isAdmin,
        });
      }
      
      return user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user-tenants'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "User created",
        description: "The user has been created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data: UserFormData & { id: number }) => {
      // First update the user
      const userUpdateData: any = {
        fullName: data.fullName,
        role: data.role,
        isSystemAdmin: data.isSystemAdmin,
      };
      
      // Only include password if it was changed
      if (data.password) {
        userUpdateData.password = data.password;
      }
      
      const userResponse = await apiRequest("PUT", `/api/users/${data.id}`, userUpdateData);
      const user = await userResponse.json();
      
      // Get existing tenant associations
      const existingAssociations = userTenants.filter(ut => ut.userId === data.id);
      
      // Delete removed associations
      for (const existing of existingAssociations) {
        const stillExists = data.tenantAccess.some(ta => ta.tenantId === existing.tenantId);
        if (!stillExists) {
          await apiRequest("DELETE", `/api/user-tenants/${existing.id}`);
        }
      }
      
      // Update or create tenant associations
      for (const tenantAccess of data.tenantAccess) {
        const existingAssoc = existingAssociations.find(ea => ea.tenantId === tenantAccess.tenantId);
        
        if (existingAssoc) {
          // Update if changed
          if (existingAssoc.role !== tenantAccess.role || existingAssoc.isAdmin !== tenantAccess.isAdmin) {
            await apiRequest("PUT", `/api/user-tenants/${existingAssoc.id}`, {
              role: tenantAccess.role,
              isAdmin: tenantAccess.isAdmin,
            });
          }
        } else {
          // Create new association
          await apiRequest("POST", "/api/user-tenants", {
            userId: data.id,
            tenantId: tenantAccess.tenantId,
            role: tenantAccess.role,
            isAdmin: tenantAccess.isAdmin,
          });
        }
      }
      
      return user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user-tenants'] });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      resetForm();
      toast({
        title: "User updated",
        description: "The user has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user-tenants'] });
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
      toast({
        title: "User deleted",
        description: "The user has been deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      username: "",
      password: "",
      fullName: "",
      role: "user",
      isSystemAdmin: false,
      tenantAccess: [],
    });
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    
    // Get user's tenant associations
    const userTenantAccess = userTenants
      .filter(ut => ut.userId === user.id)
      .map(ut => ({
        tenantId: ut.tenantId,
        role: ut.role,
        isAdmin: ut.isAdmin
      }));
    
    setFormData({
      username: user.username,
      password: "", // Don't populate password for security
      fullName: user.fullName,
      role: user.role,
      isSystemAdmin: user.isSystemAdmin || false,
      tenantAccess: userTenantAccess,
    });
    
    setIsEditDialogOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleAddTenantAccess = () => {
    if (tenants.length === 0) return;
    
    // Find a tenant that's not already in the access list
    const availableTenants = tenants.filter(
      tenant => !formData.tenantAccess.some(ta => ta.tenantId === tenant.id)
    );
    
    if (availableTenants.length === 0) return;
    
    setFormData({
      ...formData,
      tenantAccess: [
        ...formData.tenantAccess,
        {
          tenantId: availableTenants[0].id,
          role: "user",
          isAdmin: false
        }
      ]
    });
  };

  const handleRemoveTenantAccess = (index: number) => {
    const newTenantAccess = [...formData.tenantAccess];
    newTenantAccess.splice(index, 1);
    setFormData({
      ...formData,
      tenantAccess: newTenantAccess
    });
  };

  const handleTenantAccessChange = (index: number, field: keyof typeof formData.tenantAccess[0], value: any) => {
    const newTenantAccess = [...formData.tenantAccess];
    newTenantAccess[index] = {
      ...newTenantAccess[index],
      [field]: value
    };
    setFormData({
      ...formData,
      tenantAccess: newTenantAccess
    });
  };

  const getTenantName = (tenantId: number) => {
    const tenant = tenants.find(t => t.id === tenantId);
    return tenant ? tenant.name : `Tenant #${tenantId}`;
  };

  const isLoading = isUsersLoading || isTenantsLoading || isUserTenantsLoading;

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage users and their access rights
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Add a new user to the system
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="username" className="text-right">
                      Username
                    </Label>
                    <Input
                      id="username"
                      className="col-span-3"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="password" className="text-right">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      className="col-span-3"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="fullName" className="text-right">
                      Full Name
                    </Label>
                    <Input
                      id="fullName"
                      className="col-span-3"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="role" className="text-right">
                      Role
                    </Label>
                    <Select 
                      value={formData.role} 
                      onValueChange={(value) => setFormData({ ...formData, role: value })}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">System Admin</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="sysadmin"
                        checked={formData.isSystemAdmin}
                        onCheckedChange={(checked) => 
                          setFormData({ ...formData, isSystemAdmin: checked as boolean })
                        }
                      />
                      <label
                        htmlFor="sysadmin"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Has system administrator privileges
                      </label>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 mt-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-left font-bold">Tenant Access</Label>
                      <Button size="sm" type="button" onClick={handleAddTenantAccess} variant="outline">
                        <Plus className="h-4 w-4 mr-1" /> Add Tenant Access
                      </Button>
                    </div>
                    
                    {formData.tenantAccess.length > 0 ? (
                      <div className="border rounded-md p-4">
                        {formData.tenantAccess.map((access, index) => (
                          <div key={index} className="grid grid-cols-12 gap-2 items-center mb-4">
                            <Label className="col-span-2">Tenant</Label>
                            <div className="col-span-3">
                              <Select 
                                value={access.tenantId.toString()} 
                                onValueChange={(value) => handleTenantAccessChange(index, 'tenantId', parseInt(value))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select tenant" />
                                </SelectTrigger>
                                <SelectContent>
                                  {tenants.map(tenant => (
                                    <SelectItem key={tenant.id} value={tenant.id.toString()}>
                                      {tenant.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <Label className="col-span-1">Role</Label>
                            <div className="col-span-2">
                              <Select 
                                value={access.role} 
                                onValueChange={(value) => handleTenantAccessChange(index, 'role', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="viewer">Viewer</SelectItem>
                                  <SelectItem value="user">User</SelectItem>
                                  <SelectItem value="manager">Manager</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="col-span-3 flex items-center space-x-2">
                              <Checkbox
                                id={`admin-${index}`}
                                checked={access.isAdmin}
                                onCheckedChange={(checked) => 
                                  handleTenantAccessChange(index, 'isAdmin', checked as boolean)
                                }
                              />
                              <label
                                htmlFor={`admin-${index}`}
                                className="text-sm font-medium leading-none"
                              >
                                Tenant Admin
                              </label>
                            </div>
                            
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="col-span-1"
                              onClick={() => handleRemoveTenantAccess(index)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-4 border border-dashed rounded-md text-gray-500">
                        No tenant access configured. User will not have access to any tenant data.
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => createUserMutation.mutate(formData)}
                    disabled={createUserMutation.isPending}
                  >
                    {createUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create User
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>System Admin</TableHead>
                  <TableHead>Tenant Access</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length > 0 ? (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>{user.fullName}</TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell>{user.isSystemAdmin ? "Yes" : "No"}</TableCell>
                      <TableCell>
                        {userTenants
                          .filter(ut => ut.userId === user.id)
                          .map(ut => (
                            <div key={ut.id} className="text-xs mb-1">
                              <span className="font-medium">{getTenantName(ut.tenantId)}</span>
                              <span className="text-gray-500 ml-2">({ut.role}{ut.isAdmin ? ", Admin" : ""})</span>
                            </div>
                          ))}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditUser(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteUser(user)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No users found. Click "Add User" to create one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update the user information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-username" className="text-right">
                Username
              </Label>
              <Input
                id="edit-username"
                className="col-span-3"
                value={formData.username}
                disabled
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-password" className="text-right">
                Password
              </Label>
              <Input
                id="edit-password"
                type="password"
                className="col-span-3"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Leave blank to keep current password"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-fullName" className="text-right">
                Full Name
              </Label>
              <Input
                id="edit-fullName"
                className="col-span-3"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-role" className="text-right">
                Role
              </Label>
              <Select 
                value={formData.role} 
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">System Admin</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-sysadmin"
                  checked={formData.isSystemAdmin}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, isSystemAdmin: checked as boolean })
                  }
                />
                <label
                  htmlFor="edit-sysadmin"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Has system administrator privileges
                </label>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4 mt-4">
              <div className="flex justify-between items-center">
                <Label className="text-left font-bold">Tenant Access</Label>
                <Button size="sm" type="button" onClick={handleAddTenantAccess} variant="outline">
                  <Plus className="h-4 w-4 mr-1" /> Add Tenant Access
                </Button>
              </div>
              
              {formData.tenantAccess.length > 0 ? (
                <div className="border rounded-md p-4">
                  {formData.tenantAccess.map((access, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center mb-4">
                      <Label className="col-span-2">Tenant</Label>
                      <div className="col-span-3">
                        <Select 
                          value={access.tenantId.toString()} 
                          onValueChange={(value) => handleTenantAccessChange(index, 'tenantId', parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select tenant" />
                          </SelectTrigger>
                          <SelectContent>
                            {tenants.map(tenant => (
                              <SelectItem key={tenant.id} value={tenant.id.toString()}>
                                {tenant.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <Label className="col-span-1">Role</Label>
                      <div className="col-span-2">
                        <Select 
                          value={access.role} 
                          onValueChange={(value) => handleTenantAccessChange(index, 'role', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="col-span-3 flex items-center space-x-2">
                        <Checkbox
                          id={`edit-admin-${index}`}
                          checked={access.isAdmin}
                          onCheckedChange={(checked) => 
                            handleTenantAccessChange(index, 'isAdmin', checked as boolean)
                          }
                        />
                        <label
                          htmlFor={`edit-admin-${index}`}
                          className="text-sm font-medium leading-none"
                        >
                          Tenant Admin
                        </label>
                      </div>
                      
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="col-span-1"
                        onClick={() => handleRemoveTenantAccess(index)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-4 border border-dashed rounded-md text-gray-500">
                  No tenant access configured. User will not have access to any tenant data.
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => selectedUser && updateUserMutation.mutate({ ...formData, id: selectedUser.id })}
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedUser && (
              <div className="space-y-2">
                <p><strong>Username:</strong> {selectedUser.username}</p>
                <p><strong>Full Name:</strong> {selectedUser.fullName}</p>
                <p><strong>Role:</strong> {selectedUser.role}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => selectedUser && deleteUserMutation.mutate(selectedUser.id)}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;