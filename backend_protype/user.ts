import { PrismaClient } from "./prisma/client/client.ts";

const prisma = new PrismaClient();

// Type definition for creating a new user
interface CreateUserInput {
  name: string;
  email: string;
  passwort: string;
  statusId?: number;
  strasse: string;
  hausnummer: string;
  postleitzahl: string;
  land: string;
  telefonNr: string;
}

// Create a new user
export async function createUser(userData: CreateUserInput) {
  try {
    const user = await prisma.user.create({
      data: {
        ...userData,
        statusId: userData.statusId ?? 1, // Default status
      },
    });
    console.log("User created:", user);
    return user;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

// Delete user
export async function deleteUser(userId: string) {
  try {
    const user = await prisma.user.delete({
      where: { userId },
    });
    console.log("User deleted:", user);
    return user;
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
}

// Disconnect Prisma (call when done)
export async function disconnect() {
  await prisma.$disconnect();
}
