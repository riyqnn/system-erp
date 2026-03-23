import { Controller, Post, Get, Body, UseGuards, Request, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Response } from 'express';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

/**
 * DTO for login request
 */
export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

/**
 * Auth Controller
 * Handles authentication endpoints
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Login endpoint
   * POST /api/auth/login
   * Returns JWT token and user information
   * Sets HTTP-only cookies with tokens
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Res() res: Response) {
    const result = await this.authService.login(loginDto.email, loginDto.password, res);
    res.json(result);
    return res;
  }

  /**
   * Get current user profile
   * GET /api/auth/me
   * Requires authentication
   */
  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  async getCurrentUser(@CurrentUser() user: any) {
    return {
      user,
    };
  }

  /**
   * Get detailed user profile with role
   * GET /api/auth/profile
   * Requires authentication
   */
  @Get('profile')
  @UseGuards(SupabaseAuthGuard)
  async getProfile(@CurrentUser() user: any) {
    const profile = await this.authService.getUserProfile(user.id);
    return {
      profile,
    };
  }

  /**
   * Refresh token endpoint
   * POST /api/auth/refresh
   * Updates HTTP-only cookies with new tokens
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('refresh_token') refreshToken: string, @Res() res: Response) {
    const result = await this.authService.refreshToken(refreshToken, res);
    res.json(result);
    return res;
  }

  /**
   * Logout endpoint
   * POST /api/auth/logout
   * Requires authentication
   * Clears HTTP-only cookies
   */
  @Post('logout')
  @UseGuards(SupabaseAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Res() res: Response) {
    await this.authService.logout(res);
    res.json({
      message: 'Logged out successfully',
    });
    return res;
  }
}
