import { Controller, Get, Header } from '@nestjs/common'
import { privacyHtml } from './privacy-html'

@Controller('legal')
export class LegalController {
  @Get('privacy')
  @Header('Content-Type', 'text/html; charset=utf-8')
  privacy() { return privacyHtml() }
}
