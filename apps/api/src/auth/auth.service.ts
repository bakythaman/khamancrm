import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomInt, randomUUID } from 'node:crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateMeDto } from './dto/update-me.dto';

const defaultStages = [
  { name: 'Новые', color: '#64748b', sortOrder: 0 },
  { name: 'Связались', color: '#2563eb', sortOrder: 1 },
  { name: 'Переговоры', color: '#d97706', sortOrder: 2 },
  { name: 'Выиграно', color: '#059669', sortOrder: 3 },
  { name: 'Потеряно', color: '#e11d48', sortOrder: 4 },
];

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { organization: true },
    });

    const valid = user ? await bcrypt.compare(dto.password, user.passwordHash) : false;
    if (!user || !valid || !user.active) {
      throw new UnauthorizedException('validation.invalidCredentials');
    }

    return this.authResponse(user);
  }

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('validation.userExists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.companyName.trim(),
        },
      });

      await tx.pipeline.create({
        data: {
          organizationId: organization.id,
          name: 'Основная воронка',
          stages: { create: defaultStages },
        },
      });

      return tx.user.create({
        data: {
          organizationId: organization.id,
          name: dto.name.trim(),
          email,
          phone: dto.phone.trim(),
          role: 'OWNER',
          passwordHash,
          active: true,
        } as Parameters<typeof tx.user.create>[0]['data'] & { phone: string },
        include: { organization: true },
      });
    });

    const registeredUser = user as typeof user & { phone?: string; organization: { id: string; name: string } };
    await this.mail.sendWelcomeEmail(registeredUser.email, registeredUser.name, registeredUser.organization.name);
    return this.authResponse(registeredUser);
  }

  async requestPasswordReset(dto: RequestPasswordResetDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user || !user.active) return { ok: true };

    const code = String(randomInt(100000, 1000000));
    const codeHash = await bcrypt.hash(code, 12);
    await this.prisma.$executeRaw`
      INSERT INTO "PasswordResetCode" ("id", "userId", "codeHash", "expiresAt")
      VALUES (${randomUUID()}, ${user.id}, ${codeHash}, ${new Date(Date.now() + 15 * 60 * 1000)})
    `;
    await this.mail.sendPasswordResetEmail(user.email, code);
    return { ok: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const [reset] = await this.prisma.$queryRaw<Array<{ id: string; userId: string; codeHash: string }>>`
      SELECT reset.id, reset."userId", reset."codeHash"
      FROM "PasswordResetCode" reset
      INNER JOIN "User" app_user ON app_user.id = reset."userId"
      WHERE app_user.email = ${dto.email.toLowerCase()}
        AND app_user.active = true
        AND reset."usedAt" IS NULL
        AND reset."expiresAt" > NOW()
      ORDER BY reset."createdAt" DESC
      LIMIT 1
    `;

    const valid = reset ? await bcrypt.compare(dto.code, reset.codeHash) : false;
    if (!reset || !valid) {
      throw new UnauthorizedException('validation.invalidCode');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
      this.prisma.$executeRaw`UPDATE "PasswordResetCode" SET "usedAt" = ${new Date()} WHERE id = ${reset.id}`,
    ]);

    return { ok: true };
  }

  me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
        organization: { select: { id: true, name: true, timezone: true } },
      } as Parameters<typeof this.prisma.user.findUnique>[0]['select'] & { phone: true },
    });
  }

  updateMe(userId: string, dto: UpdateMeDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.email ? { email: dto.email.toLowerCase() } : {}),
        ...(dto.phone ? { phone: dto.phone.trim() } : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl || null } : {}),
      } as Parameters<typeof this.prisma.user.update>[0]['data'] & { phone?: string },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
        organization: { select: { id: true, name: true, timezone: true } },
      } as Parameters<typeof this.prisma.user.update>[0]['select'] & { phone: true },
    });
  }

  private async authResponse(user: {
    id: string;
    organizationId: string;
    email: string;
    role: string;
    name: string;
    phone?: string;
    avatarUrl: string | null;
    organization: { id: string; name: string };
  }) {
    const accessToken = await this.jwt.signAsync(
      {
        sub: user.id,
        organizationId: user.organizationId,
        email: user.email,
        role: user.role,
      },
      {
        secret: this.config.get<string>('JWT_SECRET') ?? 'development-secret',
        expiresIn: '12h',
      },
    );

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone ?? '',
        role: user.role,
        avatarUrl: user.avatarUrl,
        organizationId: user.organization.id,
      },
      organization: {
        id: user.organization.id,
        name: user.organization.name,
      },
    };
  }
}
