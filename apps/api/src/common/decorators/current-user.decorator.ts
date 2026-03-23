import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserWithRole } from '../../modules/auth/auth.service';

/**
 * CurrentUser Decorator
 * Extracts the authenticated user from the request
 *
 * Usage:
 * @Get('profile')
 * @UseGuards(SupabaseAuthGuard)
 * async getProfile(@CurrentUser() user: UserWithRole) {
 *   return user;
 * }
 *
 * Usage with specific property:
 * @Get('email')
 * @UseGuards(SupabaseAuthGuard)
 * async getEmail(@CurrentUser('email') email: string) {
 *   return { email };
 * }
 *
 * @param data - Optional property name to extract from user object
 */
export const CurrentUser = createParamDecorator(
  (data: keyof UserWithRole | undefined, ctx: ExecutionContext): UserWithRole | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as UserWithRole;

    if (!user) {
      throw new Error('User not found in request. Make sure SupabaseAuthGuard is used.');
    }

    // If data is specified, return only that property
    if (data) {
      return user[data];
    }

    // Otherwise return the full user object
    return user;
  }
);

/**
 * CurrentUserId Decorator
 * Shortcut to get only the user ID
 *
 * Usage:
 * @Get('posts')
 * @UseGuards(SupabaseAuthGuard)
 * async getPosts(@CurrentUserId() userId: string) {
 *   return this.postsService.findByUserId(userId);
 * }
 */
export const CurrentUserId = (): ParameterDecorator => CurrentUser('id');

/**
 * CurrentUserRole Decorator
 * Shortcut to get only the user's role name
 *
 * Usage:
 * @Get('admin-only')
 * @UseGuards(SupabaseAuthGuard, RolesGuard)
 * @Roles('ADMIN')
 * async adminOnly(@CurrentUserRole() role: string) {
 *   return { message: `You are ${role}` };
 * }
 */
export const CurrentUserRole = (): ParameterDecorator => CurrentUser('role');
