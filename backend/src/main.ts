import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import * as cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix for all REST endpoints: /api/v1
  app.setGlobalPrefix("api/v1");

  // Parse httpOnly cookies
  app.use(cookieParser());

  // Input validation with class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // CORS configuration for cookies & frontend requests
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  app.enableCors({
    origin: [
      frontendUrl,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://koc.uskss.com",
      "https://www.koc.uskss.com",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cookie",
      "X-Requested-With",
    ],
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(
    `Kingdom of Chess API is running on http://localhost:${port}/api/v1`,
  );
}

bootstrap();
