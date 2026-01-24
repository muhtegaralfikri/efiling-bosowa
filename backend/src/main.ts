import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  // Configure environment-based settings
  const isProduction = process.env.NODE_ENV === 'production';

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    // Default logging for development, minimal for production
    logger: isProduction ? ['error', 'warn'] : ['error', 'warn', 'log'],
  });

  // Use Winston as the default logger
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);

  if (isProduction) {
    logger.log('Production mode: Minimal logging enabled');
  }

  app.useLogger(logger);

  // Security Headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
      xFrameOptions: false,
    }),
  );

  // Gzip Compression
  app.use(compression());

  // CORS Configuration
  let allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((url) => url.trim())
    : [];

  if (!isProduction) {
    allowedOrigins = [
      ...allowedOrigins,
      'http://localhost:5173',
      'http://localhost:4173',
    ];
  }

  if (isProduction && allowedOrigins.length === 0) {
    logger.warn(
      'FRONTEND_URL is not set in production! CORS will block all origins.',
      'Bootstrap',
    );
  }

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global Validation Pipe with custom messages
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
      validationError: { target: false, value: false },
    }),
  );

  // API Versioning
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'docs', 'uploads{/*path}'],
  });

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // Swagger - disabled in production for security
  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Bosowa OCR API')
      .setDescription('OCR letters/invoice management APIs')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  // Graceful Shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application running on http://localhost:${port}`, 'Bootstrap');
  if (!isProduction) {
    logger.log(
      `Swagger docs available at http://localhost:${port}/docs`,
      'Bootstrap',
    );
  }
}
void bootstrap();
