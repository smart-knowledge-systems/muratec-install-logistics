/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as analytics from "../analytics.js";
import type * as cron from "../cron.js";
import type * as featureRequests from "../featureRequests.js";
import type * as logisticsJobs from "../logisticsJobs.js";
import type * as notifications from "../notifications.js";
import type * as savedViews from "../savedViews.js";
import type * as shipments from "../shipments.js";
import type * as supplyItems from "../supplyItems.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  analytics: typeof analytics;
  cron: typeof cron;
  featureRequests: typeof featureRequests;
  logisticsJobs: typeof logisticsJobs;
  notifications: typeof notifications;
  savedViews: typeof savedViews;
  shipments: typeof shipments;
  supplyItems: typeof supplyItems;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
