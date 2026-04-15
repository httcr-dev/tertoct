import { NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';

export async function validateBody<T>(req: Request, schema: ZodSchema<T>): Promise<{ data?: T; errorResponse?: NextResponse }> {
  try {
    const body = await req.json();
    const data = schema.parse(body);
    return { data };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        errorResponse: NextResponse.json(
          { error: 'Bad Request', details: error.issues },
          { status: 400 }
        ),
      };
    }
    return {
      errorResponse: NextResponse.json(
        { error: 'Bad Request', details: 'Invalid JSON body' },
        { status: 400 }
      ),
    };
  }
}
