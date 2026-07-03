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
        "/api/v1/incidents": {
          get: {
            summary: "List leak incidents for the current organization",
            tags: ["Water Protection"],
          },
        },
        "/api/v1/incidents/manual": {
          post: {
            summary: "Create a manual leak incident",
            tags: ["Water Protection"],
          },
        },
        "/api/v1/incidents/{incidentId}": {
          get: {
            summary: "Get a leak incident and its activity timeline",
            tags: ["Water Protection"],
          },
        },
        "/api/v1/incidents/{incidentId}/acknowledge": {
          post: {
            summary: "Acknowledge an open leak incident",
            tags: ["Water Protection"],
          },
        },
        "/api/v1/incidents/{incidentId}/investigate": {
          post: {
            summary: "Start investigating an acknowledged leak incident",
            tags: ["Water Protection"],
          },
        },
        "/api/v1/incidents/{incidentId}/contain": {
          post: {
            summary: "Mark an investigated leak incident as contained",
            tags: ["Water Protection"],
          },
        },
        "/api/v1/incidents/{incidentId}/monitor": {
          post: {
            summary: "Start post-repair monitoring for a contained incident",
            tags: ["Water Protection"],
          },
        },
        "/api/v1/incidents/{incidentId}/resolve": {
          post: {
            summary: "Resolve a monitored leak incident with an outcome note",
            tags: ["Water Protection"],
          },
        },
        "/api/v1/incidents/{incidentId}/notes": {
          post: {
            summary: "Add an immutable note to a leak incident",
            tags: ["Water Protection"],
          },
        },
        "/api/v1/incidents/{incidentId}/work-orders": {
          post: {
            summary: "Create a repair work order for a leak incident",
            tags: ["Water Protection"],
          },
        },
        "/api/v1/notifications": {
          get: {
            summary: "List the current member's in-app incident notifications",
            tags: ["Water Protection"],
          },
        },
        "/api/v1/notifications/{notificationId}/read": {
          post: {
            summary: "Mark the current member's incident notification as read",
            tags: ["Water Protection"],
          },
        },
        "/api/v1/incident-responder-settings": {
          get: {
            summary: "Get organization incident responder settings",
            tags: ["Water Protection"],
          },
          patch: {
            summary: "Update organization incident responder settings",
            tags: ["Water Protection"],
          },
        },
        "/api/v1/moisture-sensors": {
          get: {
            summary: "List moisture sensors for the current organization",
            tags: ["Water Protection"],
          },
          post: {
            summary: "Register a simulated moisture sensor",
            tags: ["Water Protection"],
          },
        },
        "/api/v1/moisture-sensors/{sensorId}": {
          get: {
            summary: "Get a moisture sensor",
            tags: ["Water Protection"],
          },
          patch: {
            summary: "Update a moisture sensor",
            tags: ["Water Protection"],
          },
        },
        "/api/v1/moisture-sensors/{sensorId}/events": {
          get: {
            summary: "List immutable moisture sensor events",
            tags: ["Water Protection"],
          },
          post: {
            summary: "Ingest a normalized moisture sensor event",
            tags: ["Water Protection"],
          },
        },
        "/api/v1/incident-correlation-settings": {
          get: {
            summary: "Get moisture sensor correlation settings",
            tags: ["Water Protection"],
          },
          patch: {
            summary: "Update moisture sensor correlation settings",
            tags: ["Water Protection"],
          },
        },
        "/api/v1/work-orders": {
          get: {
            summary: "List tenant-scoped leak repair work orders",
            tags: ["Water Protection"],
          },
        },
        "/api/v1/work-orders/{workOrderId}": {
          get: {
            summary: "Get a leak repair work order",
            tags: ["Water Protection"],
          },
          patch: {
            summary: "Update a leak repair work order",
            tags: ["Water Protection"],
          },
        },
        "/api/v1/leak-detection-policies": {
          get: {
            summary: "List continuous-flow detection policies",
            tags: ["Water Protection"],
          },
          post: {
            summary: "Create a continuous-flow detection policy",
            tags: ["Water Protection"],
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
