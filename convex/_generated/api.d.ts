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
import type * as caseTracking from "../caseTracking.js";
import type * as cron from "../cron.js";
import type * as featureRequests from "../featureRequests.js";
import type * as fieldDashboard from "../fieldDashboard.js";
import type * as fieldOperations from "../fieldOperations.js";
import type * as logisticsJobs from "../logisticsJobs.js";
import type * as materialReadiness from "../materialReadiness.js";
import type * as notifications from "../notifications.js";
import type * as photos from "../photos.js";
import type * as picking from "../picking.js";
import type * as projects from "../projects.js";
import type * as pwbsCategories from "../pwbsCategories.js";
import type * as pwbsDependencies from "../pwbsDependencies.js";
import type * as savedViews from "../savedViews.js";
import type * as shipments from "../shipments.js";
import type * as supplyItems from "../supplyItems.js";
import type * as users from "../users.js";
import type * as workPackageScheduling from "../workPackageScheduling.js";
import type * as workPackages from "../workPackages.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  analytics: typeof analytics;
  caseTracking: typeof caseTracking;
  cron: typeof cron;
  featureRequests: typeof featureRequests;
  fieldDashboard: typeof fieldDashboard;
  fieldOperations: typeof fieldOperations;
  logisticsJobs: typeof logisticsJobs;
  materialReadiness: typeof materialReadiness;
  notifications: typeof notifications;
  photos: typeof photos;
  picking: typeof picking;
  projects: typeof projects;
  pwbsCategories: typeof pwbsCategories;
  pwbsDependencies: typeof pwbsDependencies;
  savedViews: typeof savedViews;
  shipments: typeof shipments;
  supplyItems: typeof supplyItems;
  users: typeof users;
  workPackageScheduling: typeof workPackageScheduling;
  workPackages: typeof workPackages;
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
