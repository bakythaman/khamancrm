import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

export class InviteUserDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  phone!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsString()
  @MinLength(6)
  password!: string;
}
