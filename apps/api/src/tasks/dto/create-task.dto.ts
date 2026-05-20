import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  title!: string;

  @IsString()
  ownerId!: string;

  @IsDateString()
  dueAt!: string;

  @IsOptional()
  @IsString()
  dealId?: string;

  @IsOptional()
  @IsString()
  contactId?: string;
}
