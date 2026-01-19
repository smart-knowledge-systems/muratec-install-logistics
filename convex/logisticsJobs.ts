import { internalMutation } from "./_generated/server";

/**
 * Scheduled job to check for shipment delays and upcoming arrivals
 * Runs daily to:
 * 1. Detect ETA changes > 3 days and create delay_alert notifications
 * 2. Detect arrivals in next 3 days and create arrival_reminder notifications
 */
export const checkDelaysAndArrivals = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    const threeDaysFromNow = now + threeDaysMs;

    // Get all active shipments (not yet delivered)
    const shipments = await ctx.db
      .query("shipments")
      .filter((q) => q.neq(q.field("status"), "delivered"))
      .collect();

    // Get all users to notify (for now, notify all users)
    // In the future, this could be filtered to only warehouse managers or import coordinators
    const users = await ctx.db.query("users").collect();

    for (const shipment of shipments) {
      // Check for ETA delays (ETA changed by more than 3 days from original)
      if (shipment.eta && shipment.originalEta) {
        const etaDiffMs = Math.abs(shipment.eta - shipment.originalEta);
        const etaDiffDays = etaDiffMs / (24 * 60 * 60 * 1000);

        if (etaDiffDays > 3) {
          // Check if we already notified about this delay recently (within 7 days)
          const recentDelayNotification = await ctx.db
            .query("notifications")
            .filter((q) =>
              q.and(
                q.eq(q.field("type"), "delay_alert"),
                q.eq(q.field("relatedShipmentId"), shipment._id),
                q.gt(q.field("createdAt"), now - 7 * 24 * 60 * 60 * 1000),
              ),
            )
            .first();

          if (!recentDelayNotification) {
            // Create delay notification for each user
            for (const user of users) {
              const delayDays = Math.round(etaDiffDays);
              const isEarly = shipment.eta < shipment.originalEta;
              const message = isEarly
                ? `Shipment ${shipment.shipmentId} (${shipment.vesselName}) ETA moved earlier by ${delayDays} days.`
                : `Shipment ${shipment.shipmentId} (${shipment.vesselName}) delayed by ${delayDays} days.${shipment.delayReason ? ` Reason: ${shipment.delayReason}` : ""}`;

              await ctx.db.insert("notifications", {
                userId: user._id,
                type: "delay_alert",
                title: isEarly ? "Shipment ETA Updated" : "Shipment Delayed",
                message,
                relatedShipmentId: shipment._id,
                relatedProjectNumber:
                  shipment.projectNumbers.length > 0
                    ? shipment.projectNumbers[0]
                    : undefined,
                read: false,
                createdAt: now,
              });
            }
          }
        }
      }

      // Check for upcoming arrivals (ETA within next 3 days)
      if (
        shipment.eta &&
        shipment.eta <= threeDaysFromNow &&
        shipment.eta > now
      ) {
        // Check if we already sent an arrival reminder for this shipment
        const existingReminder = await ctx.db
          .query("notifications")
          .filter((q) =>
            q.and(
              q.eq(q.field("type"), "arrival_reminder"),
              q.eq(q.field("relatedShipmentId"), shipment._id),
            ),
          )
          .first();

        if (!existingReminder) {
          // Create arrival reminder for each user
          for (const user of users) {
            const daysUntilArrival = Math.ceil(
              (shipment.eta - now) / (24 * 60 * 60 * 1000),
            );
            const message = `Shipment ${shipment.shipmentId} (${shipment.vesselName}) arriving in ${daysUntilArrival} day${daysUntilArrival !== 1 ? "s" : ""}. ${shipment.caseCount} cases, ${shipment.totalWeightKg.toFixed(0)} kg.`;

            await ctx.db.insert("notifications", {
              userId: user._id,
              type: "arrival_reminder",
              title: "Upcoming Shipment Arrival",
              message,
              relatedShipmentId: shipment._id,
              relatedProjectNumber:
                shipment.projectNumbers.length > 0
                  ? shipment.projectNumbers[0]
                  : undefined,
              read: false,
              createdAt: now,
            });
          }
        }
      }
    }

    return {
      processedShipments: shipments.length,
      timestamp: now,
    };
  },
});
