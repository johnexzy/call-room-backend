import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || 'http://localhost:3000',
    credentials: true,
  });

  // Enable API versioning
  app.enableVersioning({
    type: VersioningType.URI,
  });

  // Enable validation
  app.useGlobalPipes(new ValidationPipe());

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Call Room API')
    .setDescription('The Call Room API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Get port from environment variable for Cloud Run
  const port = process.env.PORT || 8080;

  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
