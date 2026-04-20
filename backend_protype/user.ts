import { PrismaClient } from "./prisma/client/client.ts";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 10;
const BCRYPT_MAX_BYTES = 72;

function isBcryptPasswordLengthValid(password: string): boolean {
  return new TextEncoder().encode(password).length <= BCRYPT_MAX_BYTES;
}

async function hashPassword(password: string) {
  if (!isBcryptPasswordLengthValid(password)) {
    throw new Error("Password exceeds bcrypt limit of 72 bytes");
  }

  return await bcrypt.hash(password, BCRYPT_ROUNDS);
}

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
        passwort: await hashPassword(userData.passwort),
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
