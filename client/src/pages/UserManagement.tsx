import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Trash2, PencilIcon, UserCogIcon, PlusCircle, CheckCircle2, XCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tenant, User, UserTenant } from "@shared/schema";
import { useTenant } from "@/hooks/use-tenant";

// Form validation schema for creating/updating users
const userSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  role: z.string().min(2, "Role must be at least 2 characters"),
  isSystemAdmin: z.boolean().optional().default(false),
});

// Form validation schema for user tenant associations
const userTenantSchema = z.object({
  tenantId: z.coerce.number().min(1, "Please select a tenant"),
  userId: z.coerce.number().min(1, "Please select a user"),
  role: z.string().min(2, "Role must be at least 2 characters"),
  isAdmin: z.boolean().optional().default(false),
});

// Form validation schema for tenant creation
const tenantSchema = z.object({
  name: z.string().min(2, "Tenant name must be at least 2 characters"),
  code: z.string().min(2, "Tenant code must be at least 2 characters"),
  description: z.string().optional(),
  contactEmail: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  active: z.boolean().optional().default(true),
});

export default function UserManagement() {
  const { toast } = useToast();
  const { currentTenant } = useTenant();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isUserTenantDialogOpen, setIsUserTenantDialogOpen] = useState(false);
  const [isTenantDialogOpen, setIsTenantDialogOpen] = useState(false);
  const [selectedUserTenant, setSelectedUserTenant] = useState<UserTenant | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [activeTab, setActiveTab] = useState("users");

  // Fetch users
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Fetch tenants
  const { data: tenants = [], isLoading: isLoadingTenants } = useQuery<Tenant[]>({
    queryKey: ["/api/tenants"],
  });

  // Fetch user tenants
  const { data: userTenants = [], isLoading: isLoadingUserTenants } = useQuery<UserTenant[]>({
    queryKey: ["/api/user-tenants"],
  });

  // User form setup
  const userForm = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      fullName: "",
      email: "",
      role: "",
      isSystemAdmin: false,
    },
  });

  // User-tenant form setup
  const userTenantForm = useForm<z.infer<typeof userTenantSchema>>({
    resolver: zodResolver(userTenantSchema),
    defaultValues: {
      userId: 0,
      tenantId: 0,
      role: "",
      isAdmin: false,
    },
  });

  // Tenant form setup
  const tenantForm = useForm<z.infer<typeof tenantSchema>>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      contactEmail: "",
      contactPhone: "",
      address: "",
      active: true,
    },
  });

  // Mutations for users
  const createUserMutation = useMutation({
    mutationFn: async (data: z.infer<typeof userSchema>) => {
      const res = await apiRequest("POST", "/api/users", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "User created",
        description: "The user has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsUserDialogOpen(false);
      userForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof userSchema> }) => {
      const res = await apiRequest("PUT", `/api/users/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "User updated",
        description: "The user has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsUserDialogOpen(false);
      userForm.reset();
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "User deleted",
        description: "The user has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutations for user tenants
  const createUserTenantMutation = useMutation({
    mutationFn: async (data: z.infer<typeof userTenantSchema>) => {
      const res = await apiRequest("POST", "/api/user-tenants", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "User tenant association created",
        description: "The user has been associated with the tenant successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user-tenants"] });
      setIsUserTenantDialogOpen(false);
      userTenantForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating user tenant association",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateUserTenantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<z.infer<typeof userTenantSchema>> }) => {
      const res = await apiRequest("PUT", `/api/user-tenants/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "User tenant association updated",
        description: "The user tenant association has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user-tenants"] });
      setIsUserTenantDialogOpen(false);
      userTenantForm.reset();
      setSelectedUserTenant(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating user tenant association",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUserTenantMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/user-tenants/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "User tenant association deleted",
        description: "The user tenant association has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user-tenants"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting user tenant association",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutations for tenants
  const createTenantMutation = useMutation({
    mutationFn: async (data: z.infer<typeof tenantSchema>) => {
      const res = await apiRequest("POST", "/api/tenants", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Tenant created",
        description: "The tenant has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      setIsTenantDialogOpen(false);
      tenantForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating tenant",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTenantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof tenantSchema> }) => {
      const res = await apiRequest("PUT", `/api/tenants/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Tenant updated",
        description: "The tenant has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      setIsTenantDialogOpen(false);
      setSelectedTenant(null);
      tenantForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating tenant",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTenantMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/tenants/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Tenant deleted",
        description: "The tenant has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting tenant",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle user form submission
  const onUserSubmit = (data: z.infer<typeof userSchema>) => {
    const formData = { ...data };
    
    if (selectedUser) {
      updateUserMutation.mutate({ id: selectedUser.id, data: formData });
    } else {
      // Generate a random username based on the email
      const username = data.email.split('@')[0] + '-' + Math.floor(Math.random() * 10000);
      
      // Add username to form data for the API
      const newUserData = {
        ...formData,
        username,
      };
      
      createUserMutation.mutate(newUserData);
    }
  };

  // Handle user tenant form submission
  const onUserTenantSubmit = (data: z.infer<typeof userTenantSchema>) => {
    if (selectedUserTenant) {
      // For updates, we only send role and isAdmin
      const updateData = {
        role: data.role,
        isAdmin: data.isAdmin,
      };
      updateUserTenantMutation.mutate({ id: selectedUserTenant.id, data: updateData });
    } else {
      createUserTenantMutation.mutate(data);
    }
  };

  // Handle tenant form submission
  const onTenantSubmit = (data: z.infer<typeof tenantSchema>) => {
    if (selectedTenant) {
      updateTenantMutation.mutate({ id: selectedTenant.id, data });
    } else {
      createTenantMutation.mutate(data);
    }
  };

  // Handle edit user
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    userForm.reset({
      fullName: user.fullName,
      email: user.email || '',
      role: user.role,
      isSystemAdmin: user.isSystemAdmin || false,
    });
    setIsUserDialogOpen(true);
  };

  // Handle edit tenant
  const handleEditTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    tenantForm.reset({
      name: tenant.name,
      code: tenant.code,
      description: tenant.description || '',
      contactEmail: tenant.contactEmail || '',
      contactPhone: tenant.contactPhone || '',
      address: tenant.address || '',
      active: tenant.active,
    });
    setIsTenantDialogOpen(true);
  };

  // Handle create new user
  const handleCreateUser = () => {
    setSelectedUser(null);
    userForm.reset({
      fullName: "",
      email: "",
      role: "",
      isSystemAdmin: false,
    });
    setIsUserDialogOpen(true);
  };

  // Handle edit user tenant
  const handleEditUserTenant = (userTenant: UserTenant) => {
    setSelectedUserTenant(userTenant);
    userTenantForm.reset({
      userId: userTenant.userId,
      tenantId: userTenant.tenantId,
      role: userTenant.role,
      isAdmin: userTenant.isAdmin || false, // Ensure it's always a boolean
    });
    setIsUserTenantDialogOpen(true);
  };

  // Handle create new user tenant
  const handleCreateUserTenant = (userId?: number) => {
    setSelectedUserTenant(null);
    userTenantForm.reset({
      userId: userId || 0,
      tenantId: currentTenant?.id || 0,
      role: "",
      isAdmin: false,
    });
    setIsUserTenantDialogOpen(true);
  };

  // Handle create new tenant
  const handleCreateTenant = () => {
    setSelectedTenant(null);
    tenantForm.reset({
      name: "",
      code: "",
      description: "",
      contactEmail: "",
      contactPhone: "",
      address: "",
      active: true,
    });
    setIsTenantDialogOpen(true);
  };

  // Handle delete user
  const handleDeleteUser = (user: User) => {
    if (confirm(`Are you sure you want to delete the user ${user.username}? This action cannot be undone.`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  // Handle delete user tenant
  const handleDeleteUserTenant = (userTenant: UserTenant) => {
    if (confirm("Are you sure you want to delete this user-tenant association? This action cannot be undone.")) {
      deleteUserTenantMutation.mutate(userTenant.id);
    }
  };

  // Table columns for users
  const userColumns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: "username",
        header: "Username",
      },
      {
        accessorKey: "fullName",
        header: "Full Name",
      },
      {
        accessorKey: "role",
        header: "Role",
      },
      {
        accessorKey: "isSystemAdmin",
        header: "System Admin",
        cell: ({ row }) => (
          <div className="flex justify-center">
            {row.original.isSystemAdmin ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
          </div>
        ),
      },
      {
        id: "tenants",
        header: "Tenants",
        cell: ({ row }) => {
          const userTenantAssociations = userTenants.filter(ut => ut.userId === row.original.id);
          const userTenantIds = userTenantAssociations.map(ut => ut.tenantId);
          const userTenantNames = tenants
            .filter(tenant => userTenantIds.includes(tenant.id))
            .map(tenant => tenant.name);
          
          return (
            <div className="flex flex-wrap gap-1">
              {userTenantNames.map((name, i) => (
                <Badge key={i} variant="outline" className="mr-1">{name}</Badge>
              ))}
              <Button
                variant="ghost"
                size="icon" 
                onClick={() => handleCreateUserTenant(row.original.id)}
                title="Add this user to a tenant"
              >
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost" 
              size="icon" 
              onClick={() => handleEditUser(row.original)}
              title="Edit user"
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost" 
              size="icon"
              onClick={() => handleDeleteUser(row.original)}
              title="Delete user"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ),
      },
    ],
    [userTenants, tenants]
  );

  // Table columns for tenants
  const tenantColumns = useMemo<ColumnDef<Tenant>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
      },
      {
        accessorKey: "code",
        header: "Code",
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => {
          const description = row.original.description;
          return description ? (
            <span className="text-sm">{description}</span>
          ) : (
            <span className="text-gray-400 text-sm">No description</span>
          );
        },
      },
      {
        accessorKey: "contactEmail",
        header: "Contact Email",
        cell: ({ row }) => {
          const email = row.original.contactEmail;
          return email ? (
            <span className="text-sm">{email}</span>
          ) : (
            <span className="text-gray-400 text-sm">No email</span>
          );
        },
      },
      {
        accessorKey: "active",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.active ? "default" : "secondary"}>
            {row.original.active ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost" 
              size="icon" 
              onClick={() => handleEditTenant(row.original)}
              title="Edit tenant"
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost" 
              size="icon"
              onClick={() => {
                if (confirm(`Are you sure you want to delete the tenant ${row.original.name}? This action cannot be undone.`)) {
                  deleteTenantMutation.mutate(row.original.id);
                }
              }}
              title="Delete tenant"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  // Table columns for user tenants
  const userTenantColumns = useMemo<ColumnDef<UserTenant>[]>(
    () => [
      {
        id: "user",
        header: "User",
        cell: ({ row }) => {
          const user = users.find(u => u.id === row.original.userId);
          return user ? (
            <div>
              <div className="font-medium">{user.username}</div>
              <div className="text-sm text-gray-500">{user.fullName}</div>
            </div>
          ) : "Unknown";
        },
      },
      {
        id: "tenant",
        header: "Tenant",
        cell: ({ row }) => {
          const tenant = tenants.find(t => t.id === row.original.tenantId);
          return tenant ? (
            <div>
              <div className="font-medium">{tenant.name}</div>
              <div className="text-sm text-gray-500">{tenant.code}</div>
            </div>
          ) : "Unknown";
        },
      },
      {
        accessorKey: "role",
        header: "Role",
      },
      {
        accessorKey: "isAdmin",
        header: "Admin",
        cell: ({ row }) => (
          <div className="flex justify-center">
            {row.original.isAdmin ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
          </div>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost" 
              size="icon" 
              onClick={() => handleEditUserTenant(row.original)}
              title="Edit association"
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost" 
              size="icon"
              onClick={() => handleDeleteUserTenant(row.original)}
              title="Delete association"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ),
      },
    ],
    [users, tenants]
  );

  const isLoading = isLoadingUsers || isLoadingTenants || isLoadingUserTenants;

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-gray-500">Manage users and their access rights</p>
        </div>
        <UserCogIcon className="h-12 w-12 text-primary" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
          <TabsTrigger value="associations">User-Tenant Associations</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Users</CardTitle>
                <CardDescription>Manage user accounts in the system</CardDescription>
              </div>
              <Button onClick={handleCreateUser}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center p-4">Loading users...</div>
              ) : (
                <DataTable columns={userColumns} data={users} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tenants">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tenants</CardTitle>
                <CardDescription>Manage tenant organizations in the system</CardDescription>
              </div>
              <Button onClick={handleCreateTenant}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Tenant
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingTenants ? (
                <div className="flex justify-center p-4">Loading tenants...</div>
              ) : (
                <DataTable columns={tenantColumns} data={tenants} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="associations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>User-Tenant Associations</CardTitle>
                <CardDescription>Manage which users have access to which tenants</CardDescription>
              </div>
              <Button onClick={() => handleCreateUserTenant()}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Association
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center p-4">Loading associations...</div>
              ) : (
                <DataTable columns={userTenantColumns} data={userTenants} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedUser ? "Edit User" : "Create New User"}</DialogTitle>
          </DialogHeader>
          <Form {...userForm}>
            <form onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-4">
              <FormField
                control={userForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={userForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={userForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Global Role</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={userForm.control}
                name="isSystemAdmin"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>System Administrator</FormLabel>
                      <p className="text-sm text-gray-500">
                        System administrators have full access to all features and tenants
                      </p>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={createUserMutation.isPending || updateUserMutation.isPending}
                >
                  {(createUserMutation.isPending || updateUserMutation.isPending) ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* User Tenant Dialog */}
      <Dialog open={isUserTenantDialogOpen} onOpenChange={setIsUserTenantDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedUserTenant ? "Edit Association" : "Create New Association"}</DialogTitle>
          </DialogHeader>
          <Form {...userTenantForm}>
            <form onSubmit={userTenantForm.handleSubmit(onUserTenantSubmit)} className="space-y-4">
              <FormField
                control={userTenantForm.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User</FormLabel>
                    <Select
                      disabled={!!selectedUserTenant}
                      value={field.value.toString()}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a user" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.username} ({user.fullName})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={userTenantForm.control}
                name="tenantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tenant</FormLabel>
                    <Select
                      disabled={!!selectedUserTenant}
                      value={field.value.toString()}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a tenant" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tenants.map((tenant) => (
                          <SelectItem key={tenant.id} value={tenant.id.toString()}>
                            {tenant.name} ({tenant.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={userTenantForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role in Tenant</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Road Manager, Inspector, Viewer" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={userTenantForm.control}
                name="isAdmin"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Tenant Administrator</FormLabel>
                      <p className="text-sm text-gray-500">
                        Tenant administrators have full access to manage this tenant
                      </p>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={createUserTenantMutation.isPending || updateUserTenantMutation.isPending}
                >
                  {(createUserTenantMutation.isPending || updateUserTenantMutation.isPending) ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Tenant Dialog */}
      <Dialog open={isTenantDialogOpen} onOpenChange={setIsTenantDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {selectedTenant ? "Edit Tenant" : "Create New Tenant"}
            </DialogTitle>
          </DialogHeader>
          <Form {...tenantForm}>
            <form onSubmit={tenantForm.handleSubmit(onTenantSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={tenantForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tenant Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., City of Mechanicsville" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={tenantForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tenant Code *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., MECH" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={tenantForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Brief description of the tenant organization" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={tenantForm.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} placeholder="contact@organization.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={tenantForm.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Phone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="(555) 123-4567" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={tenantForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="123 Main St, City, State 12345" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={tenantForm.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active Tenant</FormLabel>
                      <p className="text-sm text-gray-500">
                        Active tenants can access the system and manage their data
                      </p>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={createTenantMutation.isPending || updateTenantMutation.isPending}
                >
                  {(createTenantMutation.isPending || updateTenantMutation.isPending) ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

