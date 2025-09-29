import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser'

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

    app.use(
    bodyParser.json({
      verify: (req: any, res, buf) => {
        if (req.originalUrl.startsWith('/transactions/webhooks/paystack')) {
          req.rawBody = buf.toString(); // store raw request body
        }
      },
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips properties that don't have decorators
      forbidNonWhitelisted: true, // throws error if unknown properties are present
      transform: true, // transforms payloads to DTO instances
    }),
  );
  app.enableCors({
    origin: 'http://localhost:5173', // allow frontend dev server
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
