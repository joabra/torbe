import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const createClient = () => {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? "postgresql://placeholder",
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
};

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function hasRequiredDelegates(client: PrismaClient) {
  const runtime = client as unknown as Record<string, unknown>;
  return Boolean(
    runtime.waitlist &&
      runtime.flightWatch &&
      runtime.bookingChecklistItem &&
      runtime.supportMessage &&
      runtime.poll &&
      runtime.notification &&
      runtime.instagramLink
  );
}

function getOrCreateClient() {
  const cached = globalForPrisma.prisma;
  if (cached && hasRequiredDelegates(cached)) {
    return cached;
  }

  const fresh = createClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = fresh;
  }
  return fresh;
}

// Proxy ensures stale dev clients are replaced lazily before any delegate access.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getOrCreateClient() as unknown as Record<string, unknown>;
    return Reflect.get(client, prop, receiver);
  },
}) as PrismaClient;

