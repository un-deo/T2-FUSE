-- AlterTable
ALTER TABLE "produkte" ADD COLUMN "Bestand" INTEGER;
ALTER TABLE "produkte" ADD COLUMN "Bundesland" TEXT;
ALTER TABLE "produkte" ADD COLUMN "Gewicht" REAL;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_user" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "statusId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwort" TEXT NOT NULL,
    "strasse" TEXT,
    "hausnummer" TEXT,
    "postleitzahl" TEXT,
    "land" TEXT,
    "telefonNr" TEXT
);
INSERT INTO "new_user" ("email", "hausnummer", "land", "name", "passwort", "postleitzahl", "statusId", "strasse", "telefonNr", "userId") SELECT "email", "hausnummer", "land", "name", "passwort", "postleitzahl", "statusId", "strasse", "telefonNr", "userId" FROM "user";
DROP TABLE "user";
ALTER TABLE "new_user" RENAME TO "user";
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
