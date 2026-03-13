'use server';

import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { OpenAI } from 'openai';

const openaiApiKey = process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY;

const RecommendedBooks = z.object({
  books: z.array(
    z.object({ author: z.string(), name: z.string(), isbn: z.string() })
  ),
});

export async function generatePrompts(prompt: string) {
  if (!openaiApiKey) {
    throw new Error(
      'Missing OpenAI API key. Set OPENAI_API_KEY (or legacy OPEN_API_KEY).'
    );
  }

  const openai = new OpenAI({
    apiKey: openaiApiKey,
  });

  try {
    const completion = await openai.beta.chat.completions.parse({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an engine that makes book recommendations based on the books the user has read. You will return an array of json objects with the books name, author and isbn. please include at least 10 books',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: zodResponseFormat(RecommendedBooks, 'recommended_books'),
    });

    return completion.choices[0].message.parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('429') || message.toLowerCase().includes('quota')) {
      throw new Error(
        'OpenAI quota exceeded. Add billing/credits or use a different API key, then try again.'
      );
    }

    throw error;
  }
}
