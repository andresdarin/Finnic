import { BadRequestException, Injectable, type ArgumentMetadata, type PipeTransform } from '@nestjs/common'
import type { ZodType } from 'zod'

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}
  transform(value: unknown, metadata: ArgumentMetadata) {
    if (metadata.type !== 'body') return value
    const result = this.schema.safeParse(value)
    if (!result.success) throw new BadRequestException(result.error.flatten())
    return result.data
  }
}
