import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { validateApiEnv } from "./config/env.schema";

async function bootstrap() {
  const env = validateApiEnv();
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    credentials: true,
    origin(
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) {
      if (!origin || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
  });
  app.setGlobalPrefix("api/v1");
  await app.listen(env.apiPort);
}

void bootstrap();
