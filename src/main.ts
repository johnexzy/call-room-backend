import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { complianceLogger } from './config/logger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Enable validation pipes
  app.useGlobalPipes(new ValidationPipe());

  // Enable versioning and set global prefix
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'v',
  });
  app.setGlobalPrefix('api');

  // Configure CORS
  app.enableCors({
    origin: configService.get('CORS_ORIGINS', 'http://localhost:3000'),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
  });

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Callroom API')
    .setDescription('The Callroom API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('queue', 'Queue management endpoints')
    .addTag('calls', 'Call handling endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Add security middleware
  app.use(helmet());
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    }),
  );

  // Add compliance logging with proper morgan configuration
  app.use(
    morgan('combined', {
      stream: {
        write: (message: string) => complianceLogger.info(message.trim()),
      },
      skip: () => process.env.NODE_ENV !== 'production',
    }),
  );

  await app.listen(process.env.PORT || 5200);
}
bootstrap();
