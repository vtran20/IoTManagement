import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BellRing,
  Building2,
  ChartNoAxesCombined,
  CircleDollarSign,
  DoorOpen,
  Download,
  Droplets,
  FileBarChart,
  Gauge,
  LayoutDashboard,
  ListOrdered,
  Search,
  Settings,
  TableProperties,
  TriangleAlert,
  Zap,
} from "lucide-react";

export const navigationIconNames = {
  Alerts: "BellRing",
  Buildings: "Building2",
  Dashboard: "LayoutDashboard",
  Meters: "Gauge",
  Reports: "FileBarChart",
  Settings: "Settings",
  Units: "DoorOpen",
} as const;

export const dashboardMetricIconNames = {
  "Device Health": "Activity",
  "Electric Usage": "Zap",
  "Open Alerts": "TriangleAlert",
  "Water Usage": "Droplets",
} as const;

export const topbarActionIconNames = {
  Export: "Download",
  Search: "Search",
} as const;

export const dashboardPanelIconNames = {
  "Report Rows": "ListOrdered",
  "Top Units": "TableProperties",
  "Total Utility Usage": "ChartNoAxesCombined",
  "Usage by Building": "Building2",
  "Estimated Cost": "CircleDollarSign",
} as const;

const iconComponents = {
  Activity,
  BellRing,
  Building2,
  ChartNoAxesCombined,
  CircleDollarSign,
  DoorOpen,
  Download,
  Droplets,
  FileBarChart,
  Gauge,
  LayoutDashboard,
  ListOrdered,
  Search,
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

export function topbarActionIconFor(
  label: keyof typeof topbarActionIconNames,
): LucideIcon {
  return iconComponents[topbarActionIconNames[label]];
}

export function dashboardPanelIconFor(
  label: keyof typeof dashboardPanelIconNames,
): LucideIcon {
  return iconComponents[dashboardPanelIconNames[label]];
}
