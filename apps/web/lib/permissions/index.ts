import type { Permission, RoleDefinition, User } from '@/lib/storage/types';

export const allPermissions: Permission[] = [
  'view_dashboard',
  'view_pipeline',
  'create_deal',
  'edit_deal',
  'delete_deal',
  'view_tasks',
  'create_task',
  'edit_task',
  'delete_task',
  'view_analytics',
  'export_analytics',
  'view_team',
  'manage_team',
  'view_settings',
  'manage_settings',
  'manage_roles',
  'manage_pipeline',
];

const managerPermissions: Permission[] = [
  'view_dashboard',
  'view_pipeline',
  'create_deal',
  'edit_deal',
  'view_tasks',
  'create_task',
  'edit_task',
  'view_team',
  'view_settings',
];

const adminPermissions: Permission[] = allPermissions.filter((permission) => permission !== 'manage_roles');

export function createDefaultRoles(createdAt = new Date().toISOString()): RoleDefinition[] {
  return [
    {
      id: 'owner',
      name: 'Owner',
      permissions: allPermissions,
      isDefault: true,
      createdAt,
    },
    {
      id: 'admin',
      name: 'Admin',
      permissions: adminPermissions,
      isDefault: true,
      createdAt,
    },
    {
      id: 'manager',
      name: 'Manager',
      permissions: managerPermissions,
      isDefault: true,
      createdAt,
    },
  ];
}

export function getRoleDefinition(roles: RoleDefinition[], roleId: string) {
  return roles.find((role) => role.id === roleId) ?? createDefaultRoles().find((role) => role.id === roleId);
}

export function hasPermission(user: User | null | undefined, roles: RoleDefinition[], permission: Permission) {
  if (!user) return false;
  if (user.role === 'owner') return true;
  const role = getRoleDefinition(roles, user.role);
  return Boolean(role?.permissions.includes(permission));
}

export function isDefaultRole(roleId: string) {
  return roleId === 'owner' || roleId === 'admin' || roleId === 'manager';
}
