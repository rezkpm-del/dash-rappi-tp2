import { createFileRoute } from "@tanstack/react-router";
import InsightsDashboard from "@/components/InsightsDashboard.jsx";

export const Route = createFileRoute("/")({
  component: InsightsDashboard,
});
