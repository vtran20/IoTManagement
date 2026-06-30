import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { validateApiEnv } from "./config/env.schema";
import { RequestContext } from "./common/request-context";
import { InMemoryPersistenceService } from "./persistence/in-memory-persistence.service";
import { DemoSeedService } from "./simulations/demo-seed.service";

async function run(): Promise<void> {
  validateApiEnv();
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  try {
    const persistence = app.get(InMemoryPersistenceService);
    const demoSeedService = app.get(DemoSeedService);
    const user = persistence.findUserByEmail("owner@north.example");
    const membership = user
      ? persistence.findPrimaryMembershipForUser(user.id)
      : undefined;
    const organization = membership
      ? persistence.findOrganizationById(membership.organizationId)
      : undefined;

    if (!user || !membership || !organization) {
      throw new Error("Unable to resolve demo owner context.");
    }

    const context: RequestContext = { membership, organization, user };
    const result = demoSeedService.seed(context);
    console.log(JSON.stringify({ result, status: "demo-seed-complete" }));
  } finally {
    await app.close();
  }
}

void run().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
