import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";

describe("Vendors API", () => {
  let app: INestApplication;
  let ownerToken: string;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
    ownerToken = await login("owner@north.example");
  });

  afterEach(async () => {
    await app.close();
  });

  async function login(email: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password: "password123" })
      .expect(201);
    return response.body.accessToken;
  }

  it("lets an owner create an organization-owned vendor with contact details", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/vendors")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        companyName: "ABC",
        contactName: "Vu Q Tran",
        email: "vuktx@yahoo.com",
        phone: "7343535568",
        trade: "Plumbing",
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          companyName: "ABC",
          contactName: "Vu Q Tran",
          email: "vuktx@yahoo.com",
          organizationId: "org_north",
          phone: "7343535568",
          status: "active",
          trade: "Plumbing",
        });
      });
  });

  it("accepts blank optional contact values from browser forms", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/vendors")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        companyName: "Minimal Plumbing",
        contactName: "",
        email: "",
        phone: "",
        trade: "Plumbing",
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          companyName: "Minimal Plumbing",
          organizationId: "org_north",
          status: "active",
          trade: "Plumbing",
        });
        expect(body.contactName).toBeUndefined();
        expect(body.email).toBeUndefined();
        expect(body.phone).toBeUndefined();
      });
  });
});
