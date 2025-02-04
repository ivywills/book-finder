import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";

export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }): Promise<Doc[]> => {
    const messages = await ctx.db
      .query("messages")
      .filter(q => q.eq(q.field("userId"), userId))
      .order("desc")
      .take(50);
    return messages;
  },
});

export const send = mutation({
  args: { body: v.string(), sender: v.optional(v.string()), userId: v.string() },
  handler: async (ctx, { body, sender, userId }) => {
    const timestamp = new Date().toISOString();
    const id = await ctx.db.insert("messages", { body, sender, userId, timestamp });
    console.log('Inserted message:', id, body, sender, userId, timestamp);
  },
});