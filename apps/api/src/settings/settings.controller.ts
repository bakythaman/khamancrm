import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { SettingsService } from './settings.service';

@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('integrations')
  integrations(@CurrentUser() user: AuthUser) {
    return this.settingsService.integrations(user.organizationId);
  }

  @Patch('workspace')
  updateWorkspace(@CurrentUser() user: AuthUser, @Body() dto: UpdateWorkspaceDto) {
    return this.settingsService.updateWorkspace(user.organizationId, dto);
  }
}
