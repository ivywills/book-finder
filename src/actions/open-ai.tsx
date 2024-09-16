"use server"

import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPEN_API_KEY, dangerouslyAllowBrowser: true });

const RecommendedBooks = z.object({
    books: z.array(z.object({author: z.string(), name: z.string(), isbn: z.string() }))
});

export async function generatePrompts(prompt: string) {
    const completion =   await openai.beta.chat.completions.parse({
        model: "gpt-4o-mini",
        messages: [
            {role: 'system', content: 'You are an engine that makes book recommendations based on the books the user has read. You will return an array of json objects with the books name, author and isbn'},
            {
                role: "user",
                content: prompt,
            },
        ],
        response_format: zodResponseFormat(RecommendedBooks, "recommended_books")
    });
    
    return completion.choices[0].message.parsed;
}