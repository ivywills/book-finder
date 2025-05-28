import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";

export const list = query({
  args: { userId: v.string(), otherUserId: v.string() },
  handler: async (ctx, { userId, otherUserId }): Promise<Doc[]> => {
    const messages = await ctx.db
      .query("messages")
      .filter(q => 
        q.or(
          q.and(
            q.eq(q.field("userId"), userId),
            q.eq(q.field("otherUserId"), otherUserId)
          ),
          q.and(
            q.eq(q.field("userId"), otherUserId),
            q.eq(q.field("otherUserId"), userId)
          )
        )
      )
      .order("desc")
      .take(50);
    return messages;
  },
});

export const send = mutation({
  args: { body: v.string(), sender: v.optional(v.string()), userId: v.string(), otherUserId: v.string() },
  handler: async (ctx, { body, sender, userId, otherUserId }) => {
    const timestamp = new Date().toISOString();
    const id = await ctx.db.insert("messages", { body, sender, userId, otherUserId, timestamp });
  },
});