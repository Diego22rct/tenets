import { Controller, Get, NotFoundException, Post } from '@nestjs/common';
import { UsersService } from './users.service.js';

class ExternalClient {
  send() {}
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  getUser() {
    // Standard NestJS exception instantiation - should NOT be flagged by dip/direct-instantiation
    throw new NotFoundException('User not found');
  }

  @Post()
  createUser() {
    // Should be flagged by dip/direct-instantiation
    const client = new ExternalClient();
    client.send();
  }
}
