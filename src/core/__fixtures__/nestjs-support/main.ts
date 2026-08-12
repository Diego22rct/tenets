import { NestFactory } from '@nestjs/core';
import { UsersModule } from './users.module.js';

export async function bootstrap() {
  const app = await NestFactory.create(UsersModule);
  await app.listen(3000);
}
