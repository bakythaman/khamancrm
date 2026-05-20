import { IsOptional, IsString } from 'class-validator';

export class CreateCallDto {
  @IsString()
  contactId!: string;

  @IsOptional()
  @IsString()
  dealId?: string;
}
