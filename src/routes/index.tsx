import { createFileRoute } from "@tanstack/react-router";
// @ts-expect-error - JSX module without type declarations
import InsightsDashboard from "@/components/InsightsDashboard.jsx";

export const Route = createFileRoute("/")({
  component: InsightsDashboard,
});
