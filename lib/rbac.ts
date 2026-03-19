export type Role = 'super_admin' | 'business_owner' | 'manager' | 'cashier' | 'inventory_staff';

export type Permission = 
  | 'manage_business'
  | 'manage_users'
  | 'manage_products'
  | 'manage_inventory'
  | 'process_sales'
  | 'view_reports'
  | 'manage_customers'
  | 'manage_settings';

const rolePermissions: Record<Role, Permission[]> = {
  super_admin: [
    'manage_business',
    'manage_users',
    'manage_products',
    'manage_inventory',
    'process_sales',
    'view_reports',
    'manage_customers',
    'manage_settings'
  ],
  business_owner: [
    'manage_users',
    'manage_products',
    'manage_inventory',
    'process_sales',
    'view_reports',
    'manage_customers',
    'manage_settings'
  ],
  manager: [
    'manage_products',
    'manage_inventory',
    'process_sales',
    'view_reports',
    'manage_customers'
  ],
  cashier: [
    'process_sales',
    'manage_customers'
  ],
  inventory_staff: [
    'manage_products',
    'manage_inventory'
  ]
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) || false;
}

export function canAccessRoute(role: Role, path: string): boolean {
  const routePermissions: Record<string, Permission> = {
    '/dashboard/products': 'manage_products',
    '/dashboard/inventory': 'manage_inventory',
    '/dashboard/sales': 'process_sales',
    '/dashboard/reports': 'view_reports',
    '/dashboard/customers': 'manage_customers',
    '/dashboard/employees': 'manage_users',
    '/dashboard/settings': 'manage_settings'
  };

  const requiredPermission = routePermissions[path];
  if (!requiredPermission) return true;

  return hasPermission(role, requiredPermission);
}

// Helper to check if user can perform specific actions
export function canPerformAction(role: Role, action: string): boolean {
  const actionMap: Record<string, Permission> = {
    'create_product': 'manage_products',
    'edit_product': 'manage_products',
    'delete_product': 'manage_products',
    'create_sale': 'process_sales',
    'view_analytics': 'view_reports',
    'manage_employee': 'manage_users',
    'update_inventory': 'manage_inventory'
  };

  const permission = actionMap[action];
  if (!permission) return false;

  return hasPermission(role, permission);
}

// Check if role has access to view all tenant data (super admin only)
export function canViewAllTenants(role: Role): boolean {
  return role === 'super_admin';
}
