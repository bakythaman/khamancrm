import { IsEmail, IsEnum, IsString } from 'class-validator';
import { UserRole } from '@prisma/client';

export class InviteUserDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsEnum(UserRole)
  role!: UserRole;
}
