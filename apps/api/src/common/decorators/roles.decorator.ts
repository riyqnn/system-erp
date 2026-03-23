import { SetMetadata } from '@nestjs/common';

/**
 * Roles key for metadata
 */
export const ROLES_KEY = 'roles';

/**
 * Roles Decorator
 * Specifies which roles can access a route
 *
 * Usage:
 * @Roles('ADMIN')
 * @Roles('INVENTORY', 'PRODUCTION')
 * @Roles('ADMIN', 'INVENTORY', 'FINANCE', 'PURCHASING', 'PRODUCTION', 'SNM')
 *
 * Example:
 * @Post()
 * @UseGuards(SupabaseAuthGuard, RolesGuard)
 * @Roles('ADMIN', 'INVENTORY')
 * async createProduct(@Body() createProductDto: CreateProductDto) {
 *   // Only users with ADMIN or INVENTORY role can access
 * }
 *
 * @param roles - Array of role names that can access this route
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Available role names in the system
 */
export const ROLE_NAMES = {
  ADMIN: 'ADMIN',
  INVENTORY: 'INVENTORY',
  FINANCE: 'FINANCE',
  PURCHASING: 'PURCHASING',
  PRODUCTION: 'PRODUCTION',
  SNM: 'SNM',
} as const;
