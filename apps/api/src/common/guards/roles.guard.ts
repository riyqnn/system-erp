import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserWithRole } from '../../modules/auth/auth.service';

/**
 * Roles Guard
 * Checks if the authenticated user has the required role(s)
 *
 * Usage:
 * @UseGuards(SupabaseAuthGuard, RolesGuard)
 * @Roles('ADMIN', 'INVENTORY')
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from decorator metadata
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are specified, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: UserWithRole = request.user;

    // Check if user exists (authenticated)
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has a role
    if (!user.role) {
      throw new ForbiddenException('User does not have a role assigned');
    }

    // Check if user's role matches any of the required roles
    const hasRole = requiredRoles.includes(user.role.name);

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required role(s): ${requiredRoles.join(', ')}. Your role: ${user.role.name}`
      );
    }

    return true;
  }
}
