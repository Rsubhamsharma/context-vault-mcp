import { env } from "./config/env";
import { prisma } from "./db/prisma";
import { app } from "./app";

const server = app.listen(env.PORT, () => {
  console.log(`Context Vault API listening on port ${env.PORT}`);
});

const shutdown = async (): Promise<void> => {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});
