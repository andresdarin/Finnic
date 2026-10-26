import 'dotenv/config'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AppModule } from './app.module'

async function bootstrap() {
  // rawBody is required to verify Meta's X-Hub-Signature-256 over the exact bytes.
  const app = await NestFactory.create(AppModule, { rawBody: true })

  const configService = app.get(ConfigService)
  const frontendOrigins = (configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
  const allowedOrigins = Array.from(
    new Set([
      ...frontendOrigins,
      'https://lovehold-web.vercel.app',
      'https://www.finnic.space',
      'https://finnic.space',
    ]),
  )

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  })

  app.setGlobalPrefix('api')

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  )

  const port = configService.get<string>('PORT') ?? '3001'
  await app.listen(port, '0.0.0.0')
  console.log(`API running on http://localhost:${port}`)
}

bootstrap()
