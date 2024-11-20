import { NestFactory } from '@nestjs/core';
import { SeederModule } from './seeders/seeder.module';
import { UserSeeder } from './seeders/user.seeder';

async function bootstrap() {
  const app = await NestFactory.create(SeederModule);

  const seeder = app.get(UserSeeder);
  await seeder.seed();

  await app.close();
}

bootstrap();
