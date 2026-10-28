import { IsEnum, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator'
import { DefaultQueryPeriod } from '@prisma/client'

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  displayName?: string

  @IsOptional()
  @IsString()
  avatarUrl?: string

  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(DefaultQueryPeriod)
  defaultQueryPeriod?: DefaultQueryPeriod
}
