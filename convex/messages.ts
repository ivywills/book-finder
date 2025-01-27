import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";

export const list = query({
  handler: async (ctx): Promise<Doc[]> => {
    const messages = await ctx.db
      .query("messages")
      .order("desc")
      .take(50);
    return messages;
  },
});

export const send = mutation({
  args: { body: v.string(), sender: v.optional(v.string()) },
  handler: async (ctx, { body, sender }) => {
    const id = await ctx.db.insert("messages", { body, sender });
    console.log('Inserted message:', id, body, sender);
  },
});