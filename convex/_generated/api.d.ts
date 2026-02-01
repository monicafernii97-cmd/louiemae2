/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aliexpress from "../aliexpress.js";
import type * as auth from "../auth.js";
import type * as blogPosts from "../blogPosts.js";
import type * as campaigns from "../campaigns.js";
import type * as cjActions from "../cjActions.js";
import type * as cjDropshipping from "../cjDropshipping.js";
import type * as cjHelpers from "../cjHelpers.js";
import type * as crons from "../crons.js";
import type * as customPages from "../customPages.js";
import type * as emails from "../emails.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as orders from "../orders.js";
import type * as products from "../products.js";
import type * as scraper from "../scraper.js";
import type * as siteContent from "../siteContent.js";
import type * as subscribers from "../subscribers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aliexpress: typeof aliexpress;
  auth: typeof auth;
  blogPosts: typeof blogPosts;
  campaigns: typeof campaigns;
  cjActions: typeof cjActions;
  cjDropshipping: typeof cjDropshipping;
  cjHelpers: typeof cjHelpers;
  crons: typeof crons;
  customPages: typeof customPages;
  emails: typeof emails;
  files: typeof files;
  http: typeof http;
  orders: typeof orders;
  products: typeof products;
  scraper: typeof scraper;
  siteContent: typeof siteContent;
  subscribers: typeof subscribers;
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
