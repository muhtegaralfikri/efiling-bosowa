import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerModule } from './common/logger';
import { AuthModule } from './modules/auth/auth.module';
import { DeleteRequestsModule } from './modules/delete-requests/delete-requests.module';
import { EditLogsModule } from './modules/edit-logs/edit-logs.module';
import { FilesModule } from './modules/files/files.module';
import { LettersModule } from './modules/letters/letters.module';
import { OcrModule } from './modules/ocr/ocr.module';
import { StatsModule } from './modules/stats/stats.module';
import { UsersModule } from './modules/users/users.module';
import { SignaturesModule } from './modules/signatures/signatures.module';
import { SignatureRequestsModule } from './modules/signature-requests/signature-requests.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule,
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const username = config.getOrThrow<string>('DB_USER');
        const password =
          config.get<string>('DB_PASSWORD') ??
          config.get<string>('DB_PASS') ??
          (() => {
            throw new Error('DB_PASSWORD is not set');
          })();
        const database = config.getOrThrow<string>('DB_NAME');

        return {
          type: 'mysql',
          host: config.get<string>('DB_HOST') || 'localhost',
          port: +(config.get<string>('DB_PORT') || 3306),
          username,
          password,
          database,
          autoLoadEntities: true,
          synchronize: process.env.NODE_ENV !== 'production',
          timezone: '+08:00', // WITA timezone (UTC+8) for Makassar server
          // Connection Pool Settings (optimized for 2GB VPS)
          extra: {
            connectionLimit: 10,
            waitForConnections: true,
            queueLimit: 0,
            connectTimeout: 10000,
          },
          // Connection retry settings
          retryAttempts: 3,
          retryDelay: 3000,
        };
      },
    }),
    AuthModule,
    UsersModule,
    FilesModule,
    OcrModule,
    LettersModule,
    DeleteRequestsModule,
    EditLogsModule,
    StatsModule,
    SignaturesModule,
    SignatureRequestsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
