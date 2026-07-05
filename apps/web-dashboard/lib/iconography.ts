import type { LucideIcon } from "lucide-react";
import {
  BellRing,
  Building2,
  ChartNoAxesCombined,
  CircleDollarSign,
  DoorOpen,
  Droplets,
  FileBarChart,
  Gauge,
  LayoutDashboard,
  ListOrdered,
  Settings,
  TableProperties,
  TriangleAlert,
  Zap,
} from "lucide-react";

export const navigationIconNames = {
  Alerts: "BellRing",
  Buildings: "Building2",
  Dashboard: "LayoutDashboard",
  Incidents: "Droplets",
  Meters: "Gauge",
  Reports: "FileBarChart",
  Settings: "Settings",
  Units: "DoorOpen",
  "Work Orders": "ListOrdered",
} as const;

export const dashboardMetricIconNames = {
  "Critical alerts": "TriangleAlert",
  "Devices offline": "Gauge",
  "Electric Usage": "Zap",
  "Incidents without repair": "Droplets",
  "Overdue work": "ListOrdered",
  "Water Usage": "Droplets",
} as const;

export const dashboardPanelIconNames = {
  "Report Rows": "ListOrdered",
  "Top Units": "TableProperties",
  "Total Utility Usage": "ChartNoAxesCombined",
  "Usage by Building": "Building2",
  "Estimated Cost": "CircleDollarSign",
} as const;

const iconComponents = {
  BellRing,
  Building2,
  ChartNoAxesCombined,
  CircleDollarSign,
  DoorOpen,
  Droplets,
  FileBarChart,
  Gauge,
  LayoutDashboard,
  ListOrdered,
  Settings,
  TableProperties,
  TriangleAlert,
  Zap,
} satisfies Record<string, LucideIcon>;

export function navigationIconFor(
  label: keyof typeof navigationIconNames,
): LucideIcon {
  return iconComponents[navigationIconNames[label]];
}

export function dashboardMetricIconFor(
  label: keyof typeof dashboardMetricIconNames,
): LucideIcon {
  return iconComponents[dashboardMetricIconNames[label]];
}

export function dashboardPanelIconFor(
  label: keyof typeof dashboardPanelIconNames,
): LucideIcon {
  return iconComponents[dashboardPanelIconNames[label]];
}
