import { notFound } from "next/navigation";
import { isAppError } from "@/core/errors";

/** Turns a service NotFoundError into a 404 page; rethrows anything else. */
export async function orNotFound<T>(p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch (e) {
    if (isAppError(e) && e.code === "not_found") notFound();
    throw e;
  }
}
