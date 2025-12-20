/**
 * Route helpers - shared utilities for API routes.
 */
import { ZodSchema, ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

/** Validates request body against a Zod schema. Throws on invalid data. */
export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(fromZodError(error).message);
    }
    throw error;
  }
}
