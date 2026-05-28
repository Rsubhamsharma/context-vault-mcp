import bcrypt from "bcrypt";
import { PrismaClient, VersionSource } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash("password123", 12);

  const user = await prisma.user.upsert({
    where: { email: "demo@contextvault.local" },
    update: {},
    create: {
      email: "demo@contextvault.local",
      name: "Demo User",
      passwordHash
    }
  });

  const project = await prisma.project.create({
    data: {
      userId: user.id,
      name: "Context Vault Demo",
      description: "Seed project for API exploration",
      defaultBranch: "main"
    }
  });

  const context = await prisma.projectContext.create({
    data: {
      projectId: project.id,
      goal: "Build a persistent account-based AI-readable project memory store.",
      techStack: ["Node.js", "TypeScript", "Express", "Prisma", "PostgreSQL"],
      features: ["Projects", "Official context", "Immutable versions", "Suggestions"],
      decisions: ["AI suggestions require explicit application"],
      constraints: ["No frontend in backend foundation"],
      issues: [],
      dependencies: ["express", "prisma", "zod", "jsonwebtoken", "bcrypt"],
      nextSteps: ["Add MCP API-key authentication later"],
      architectureNotes: ["Services own project authorization and mutations"],
      aiInstructions: "Treat ProjectContext as the official source of truth.",
      currentVersionNumber: 1
    }
  });

  await prisma.contextVersion.create({
    data: {
      projectId: project.id,
      versionNumber: 1,
      snapshot: {
        goal: context.goal,
        techStack: context.techStack,
        features: context.features,
        decisions: context.decisions,
        constraints: context.constraints,
        issues: context.issues,
        dependencies: context.dependencies,
        nextSteps: context.nextSteps,
        architectureNotes: context.architectureNotes,
        aiInstructions: context.aiInstructions,
        versionNumber: context.currentVersionNumber
      },
      changeSummary: "Seed initial context",
      source: VersionSource.manual
    }
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
