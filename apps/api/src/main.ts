import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { validateApiEnv } from "./config/env.schema";

async function bootstrap() {
  const env = validateApiEnv();
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api/v1");
  await app.listen(env.apiPort);
}

void bootstrap();
