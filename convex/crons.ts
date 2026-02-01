import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Sync CJ tracking information every 4 hours
// This checks orders with CJ status "confirmed" or "processing" for tracking updates
crons.interval(
    "sync-cj-tracking",
    { hours: 4 },
    internal.cjDropshipping.syncAllTracking,
    {}
);

export default crons;
