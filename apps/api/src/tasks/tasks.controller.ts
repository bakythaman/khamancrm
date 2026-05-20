import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { TasksService } from './tasks.service';

@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('ownerId') ownerId?: string) {
    return this.tasksService.list(user.organizationId, ownerId);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(user.organizationId, dto);
  }

  @Patch(':id/complete')
  complete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tasksService.complete(user.organizationId, id);
  }
}
