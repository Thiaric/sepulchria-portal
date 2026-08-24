import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

export type AuditActorContext = {
  userId: string;
  role: "owner" | "admin" | "moderator" | "master";
};

const storage =
  new AsyncLocalStorage<AuditActorContext>();

export function setAuditActorContext(
  context: AuditActorContext,
) {
  storage.enterWith(context);
}

export function getAuditActorContext():
  AuditActorContext | null {
  return storage.getStore() ?? null;
}
