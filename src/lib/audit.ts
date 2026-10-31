import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function audit(actor: string, action: string, entityType: string, entityId: string, metadata?: Prisma.InputJsonValue) {
  await prisma.auditLog.create({
    data: { actor, action, entityType, entityId, metadata },
  });
}
