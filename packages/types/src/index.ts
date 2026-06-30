export const platformName = "IoT Management" as const;

export interface HealthResponse {
  status: "ok";
  service: string;
}
