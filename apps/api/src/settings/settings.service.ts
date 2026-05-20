import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  integrations(organizationId: string) {
    return this.prisma.integrationAccount.findMany({
      where: { organizationId },
      orderBy: { provider: 'asc' },
    });
  }

  updateWorkspace(organizationId: string, dto: UpdateWorkspaceDto) {
    return this.prisma.organization.update({
      where: { id: organizationId },
      data: dto,
      select: { id: true, name: true, timezone: true, updatedAt: true },
    });
  }
}
