import { IsString } from 'class-validator';

export class UpdateDealStageDto {
  @IsString()
  stageId!: string;
}
