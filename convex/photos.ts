import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Generate an upload URL for photo upload
 * Returns a URL that the client can POST the file to
 */
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Get a URL to view/download a stored photo
 */
export const getPhotoUrl = mutation({
  args: {
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

/**
 * Delete a photo from storage
 * Used when removing photos from damage reports or discrepancies
 */
export const deletePhoto = mutation({
  args: {
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.storage.delete(args.storageId);
  },
});
