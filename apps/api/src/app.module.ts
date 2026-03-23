import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import * as path from 'path';

@Module({
  imports: [
    // Global configuration module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        '.env',
        path.join(process.cwd(), '.env'),
        path.join(process.cwd(), 'apps', 'api', '.env'),
      ],
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),
    // Auth module for authentication and authorization
    // Other modules will be added by sub-teams (Inventory, Finance, Purchasing, Production, SNM)
    AuthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
