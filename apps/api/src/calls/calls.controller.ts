import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CallsService } from './calls.service';
import { CreateCallDto } from './dto/create-call.dto';

@UseGuards(JwtAuthGuard)
@Controller('calls')
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.callsService.list(user.organizationId);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCallDto) {
    return this.callsService.create(user.organizationId, user.sub, dto);
  }
}
