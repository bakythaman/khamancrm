import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(organizationId: string) {
    const [openDeals, wonDeals, lostDeals, openTasks] = await Promise.all([
      this.prisma.deal.count({ where: { organizationId, status: 'OPEN' } }),
      this.prisma.deal.count({ where: { organizationId, status: 'WON' } }),
      this.prisma.deal.count({ where: { organizationId, status: 'LOST' } }),
      this.prisma.task.count({ where: { organizationId, status: 'OPEN' } }),
    ]);

    return {
      openDeals,
      wonDeals,
      lostDeals,
      openTasks,
      conversionRate: wonDeals + lostDeals === 0 ? 0 : wonDeals / (wonDeals + lostDeals),
      responseTimeMinutes: 11,
    };
  }

  managers(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId, active: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        _count: {
          select: {
            ownedDeals: true,
            assignedChats: true,
            tasks: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  pipeline(organizationId: string) {
    return this.prisma.pipeline.findMany({
      where: { organizationId },
      include: {
        stages: {
          orderBy: { sortOrder: 'asc' },
          include: {
            deals: {
              where: { status: 'OPEN' },
              select: { id: true, valueCents: true, updatedAt: true },
            },
          },
        },
      },
    });
  }
}
