import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateDealDto {
  @IsString()
  title!: string;

  @IsString()
  contactId!: string;

  @IsString()
  ownerId!: string;

  @IsString()
  stageId!: string;

  @IsInt()
  @Min(0)
  valueCents!: number;

  @IsOptional()
  @IsString()
  nextStep?: string;
}
