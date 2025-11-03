import { PrismaClient } from "./prisma/client/client.ts";
const prisma = new PrismaClient();

const seed_users = [
  {
    name: "Testname",
    email: "Testemail@Testemail.Testemail",
    password: "Testpassword",
  },
];

export async function seed() {
  for (const user of seed_users) {
    await prisma.user.create({
      data: user,
    });
  }
}
