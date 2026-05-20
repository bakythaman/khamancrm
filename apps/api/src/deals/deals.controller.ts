import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealStageDto } from './dto/update-deal-stage.dto';
import { DealsService } from './deals.service';

@UseGuards(JwtAuthGuard)
@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('stageId') stageId?: string) {
    return this.dealsService.list(user.organizationId, stageId);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDealDto) {
    return this.dealsService.create(user.organizationId, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.dealsService.get(user.organizationId, id);
  }

  @Patch(':id/stage')
  moveStage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateDealStageDto,
  ) {
    return this.dealsService.moveStage(user.organizationId, id, dto.stageId);
  }
}
