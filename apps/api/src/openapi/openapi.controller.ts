import { Controller, Get } from "@nestjs/common";

@Controller("openapi.json")
export class OpenApiController {
  @Get()
  getDocument() {
    return {
      openapi: "3.1.0",
      info: {
        title: "IoT Management API",
        version: "0.1.0",
      },
      paths: {
        "/api/v1/auth/login": {
          post: {
            summary: "Authenticate a user and create a session",
            tags: ["Auth"],
          },
        },
        "/api/v1/auth/logout": {
          post: {
            summary: "Revoke the current session",
            tags: ["Auth"],
          },
        },
        "/api/v1/audit/events": {
          get: {
            summary: "List organization-scoped audit events",
            tags: ["Audit"],
          },
        },
        "/api/v1/buildings": {
          get: {
            summary: "List buildings for the current organization",
            tags: ["Buildings"],
          },
          post: {
            summary: "Create a building",
            tags: ["Buildings"],
          },
        },
        "/api/v1/dashboard/overview": {
          get: {
            summary:
              "Return the current organization's dashboard summary, trends, rankings, and device health in one response",
            tags: ["Dashboard"],
          },
        },
        "/api/v1/meters": {
          get: {
            summary: "List meters for the current organization",
            tags: ["Meters"],
          },
          post: {
            summary: "Create a meter",
            tags: ["Meters"],
          },
        },
        "/api/v1/readings/ingest": {
          post: {
            summary: "Ingest a normalized meter reading",
            tags: ["Readings"],
          },
        },
      },
    };
  }
}
