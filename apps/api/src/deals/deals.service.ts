import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateDealDto } from './dto/create-deal.dto';

@Injectable()
export class DealsService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string, stageId?: string) {
    return this.prisma.deal.findMany({
      where: { organizationId, ...(stageId ? { stageId } : {}) },
      include: {
        contact: true,
        owner: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } },
        stage: true,
        tasks: { where: { status: 'OPEN' }, orderBy: { dueAt: 'asc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  create(organizationId: string, dto: CreateDealDto) {
    return this.prisma.deal.create({
      data: {
        organizationId,
        title: dto.title,
        contactId: dto.contactId,
        ownerId: dto.ownerId,
        stageId: dto.stageId,
        valueCents: dto.valueCents,
        nextStep: dto.nextStep,
      },
    });
  }

  async get(organizationId: string, id: string) {
    const deal = await this.prisma.deal.findFirst({
      where: { id, organizationId },
      include: {
        contact: true,
        owner: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } },
        stage: true,
        tasks: { orderBy: { dueAt: 'asc' } },
        calls: { orderBy: { startedAt: 'desc' }, take: 10 },
        aiNotes: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
    if (!deal) throw new NotFoundException('Deal not found');
    return deal;
  }

  async moveStage(organizationId: string, id: string, stageId: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id, organizationId }, select: { id: true } });
    if (!deal) throw new NotFoundException('Deal not found');

    return this.prisma.deal.update({
      where: { id },
      data: { stageId },
    });
  }
}
