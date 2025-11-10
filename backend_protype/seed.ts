import { PrismaClient } from "./prisma/client/client.ts";
//import {}
const prisma = new PrismaClient();

const seed_users = [
  { name: "Ben", email: "ben@example.com", password: "abc123" },
  { name: "jerk", email: "jerk@example.com", password: "abc123" },
  { name: "marcel", email: "marcel@example.com", password: "abc123" },
  { name: "dejan", email: "dejan@example.com", password: "abc123" },
  { name: "Georg", email: "Georg@example.com", password: "abc123" },
];

export async function seed() {
  for (const user of seed_users) {
    await prisma.user.create({
      data: user,
    });
  }
}

if (import.meta.main) {
  await seed();
  console.log("Seeding finished.");
}
