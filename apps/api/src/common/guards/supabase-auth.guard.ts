import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../../modules/auth/auth.service';
import { UserWithRole } from '../../modules/auth/auth.service';

/**
 * Supabase Auth Guard
 * Validates JWT tokens from Supabase and attaches user to request
 *
 * Usage:
 * @UseGuards(SupabaseAuthGuard)
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Try to get token from Authorization header first (server-side calls)
    let token: string | undefined;

    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    }

    // Fallback: try to get token from cookies (client-side calls)
    if (!token && request.cookies?.access_token) {
      token = request.cookies.access_token;
    }

    if (!token) {
      throw new UnauthorizedException('Authorization token not provided');
    }

    try {
      // Verify token and get user profile
      const user: UserWithRole = await this.authService.verifyToken(token);

      // Attach user to request for use in controllers
      request.user = user;

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

/**
 * Optional Auth Guard
 * Similar to SupabaseAuthGuard but doesn't throw error if token is missing
 * Useful for endpoints that work differently for authenticated vs anonymous users
 *
 * Usage:
 * @UseGuards(OptionalAuthGuard)
 */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    // If no auth header, allow but don't attach user
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return true;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Try to verify token
      const user: UserWithRole = await this.authService.verifyToken(token);
      request.user = user;
    } catch {
      // Invalid token, but we allow the request to proceed
      // Controllers should check if request.user exists
    }

    return true;
  }
}
