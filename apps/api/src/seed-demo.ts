import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { validateApiEnv } from "./config/env.schema";
import { RequestContext } from "./common/request-context";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
} from "./persistence/persistence.service";
import { DemoSeedService } from "./simulations/demo-seed.service";

async function run(): Promise<void> {
  validateApiEnv();
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  try {
    const persistence = app.get<PersistenceService>(PERSISTENCE_SERVICE);
    const demoSeedService = app.get(DemoSeedService);
    const user = await persistence.findUserByEmail("owner@north.example");
    const membership = user
      ? await persistence.findPrimaryMembershipForUser(user.id)
      : undefined;
    const organization = membership
      ? await persistence.findOrganizationById(membership.organizationId)
      : undefined;

    if (!user || !membership || !organization) {
      throw new Error("Unable to resolve demo owner context.");
    }

    const context: RequestContext = { membership, organization, user };
    const result = await demoSeedService.seed(context);
    console.log(JSON.stringify({ result, status: "demo-seed-complete" }));
  } finally {
    await app.close();
  }
}

void run().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
