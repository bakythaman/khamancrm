import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string, ownerId?: string) {
    return this.prisma.task.findMany({
      where: { organizationId, ...(ownerId ? { ownerId } : {}) },
      include: {
        owner: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
        contact: true,
        deal: true,
      },
      orderBy: { dueAt: 'asc' },
    });
  }

  create(organizationId: string, dto: CreateTaskDto) {
    return this.prisma.task.create({
      data: {
        organizationId,
        ownerId: dto.ownerId,
        title: dto.title,
        dueAt: new Date(dto.dueAt),
        dealId: dto.dealId,
        contactId: dto.contactId,
      },
    });
  }

  async complete(organizationId: string, id: string) {
    const task = await this.prisma.task.findFirst({ where: { id, organizationId }, select: { id: true } });
    if (!task) throw new NotFoundException('Task not found');
    return this.prisma.task.update({
      where: { id },
      data: { status: 'DONE', completedAt: new Date() },
    });
  }
}
