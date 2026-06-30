import { Global, Module } from "@nestjs/common";
import { DatabaseService } from "./database.service";

@Global()
@Module({
  exports: [DatabaseService],
  providers: [
    {
      provide: "DATABASE_OPTIONS",
      useValue: {},
    },
    DatabaseService,
  ],
})
export class DatabaseModule {}
