import { createFileRoute } from "@tanstack/react-router";
import InsightsDashboard from "@/components/InsightsDashboard";

export const Route = createFileRoute("/")({
  component: InsightsDashboard,
});
