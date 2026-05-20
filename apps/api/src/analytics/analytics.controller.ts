import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  overview(@CurrentUser() user: AuthUser) {
    return this.analyticsService.overview(user.organizationId);
  }

  @Get('managers')
  managers(@CurrentUser() user: AuthUser) {
    return this.analyticsService.managers(user.organizationId);
  }

  @Get('pipeline')
  pipeline(@CurrentUser() user: AuthUser) {
    return this.analyticsService.pipeline(user.organizationId);
  }
}
