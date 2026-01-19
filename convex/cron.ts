import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run delay detection and notification job daily at 9 AM UTC
crons.daily(
  "check shipment delays and arrivals",
  { hourUTC: 9, minuteUTC: 0 },
  internal.logisticsJobs.checkDelaysAndArrivals,
);

export default crons;
