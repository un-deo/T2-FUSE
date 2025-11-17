/*
  Warnings:

  - The primary key for the `user` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `user` table. All the data in the column will be lost.
  - Added the required column `hausnummer` to the `user` table without a default value. This is not possible if the table is not empty.
  - Added the required column `land` to the `user` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passwort` to the `user` table without a default value. This is not possible if the table is not empty.
  - Added the required column `postleitzahl` to the `user` table without a default value. This is not possible if the table is not empty.
  - Added the required column `statusId` to the `user` table without a default value. This is not possible if the table is not empty.
  - Added the required column `strasse` to the `user` table without a default value. This is not possible if the table is not empty.
  - Added the required column `telefonNr` to the `user` table without a default value. This is not possible if the table is not empty.
  - The required column `userId` was added to the `user` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- CreateTable
CREATE TABLE "produkte" (
    "produktId" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "beschreibung" TEXT NOT NULL,
    "preis" REAL NOT NULL,
    "userId" TEXT NOT NULL,
    "selbstabholung" BOOLEAN NOT NULL,
    "versand" BOOLEAN NOT NULL,
    "kategorieId" TEXT NOT NULL,
    "suchfilterattribute" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    CONSTRAINT "produkte_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("userId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "produkte_kategorieId_fkey" FOREIGN KEY ("kategorieId") REFERENCES "kategorie" ("kategorieId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "kategorie" (
    "kategorieId" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "beschreibung" TEXT
);

-- CreateTable
CREATE TABLE "einstellungen" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "lightDark" BOOLEAN NOT NULL,
    "schriftgröße" INTEGER NOT NULL,
    CONSTRAINT "einstellungen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("userId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "verkäuferstatusanfrage" (
    "anfrageId" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "status" TEXT,
    "datum" DATETIME,
    "kommentarAdmin" TEXT,
    CONSTRAINT "verkäuferstatusanfrage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("userId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "warenkorb" (
    "warenkorbId" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "erstellungsdatum" DATETIME NOT NULL,
    CONSTRAINT "warenkorb_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("userId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "warenkorbProdukte" (
    "warenkorbId" TEXT NOT NULL,
    "produktId" TEXT NOT NULL,
    "menge" INTEGER NOT NULL,

    PRIMARY KEY ("warenkorbId", "produktId"),
    CONSTRAINT "warenkorbProdukte_warenkorbId_fkey" FOREIGN KEY ("warenkorbId") REFERENCES "warenkorb" ("warenkorbId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "warenkorbProdukte_produktId_fkey" FOREIGN KEY ("produktId") REFERENCES "produkte" ("produktId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bestellung" (
    "bestellId" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "datum" DATETIME NOT NULL,
    "gesamtbetrag" REAL NOT NULL,
    CONSTRAINT "bestellung_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("userId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bestellungProdukte" (
    "bestellId" TEXT NOT NULL,
    "produktId" TEXT NOT NULL,
    "menge" INTEGER NOT NULL,

    PRIMARY KEY ("bestellId", "produktId"),
    CONSTRAINT "bestellungProdukte_bestellId_fkey" FOREIGN KEY ("bestellId") REFERENCES "bestellung" ("bestellId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "bestellungProdukte_produktId_fkey" FOREIGN KEY ("produktId") REFERENCES "produkte" ("produktId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_user" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "statusId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwort" TEXT NOT NULL,
    "strasse" TEXT NOT NULL,
    "hausnummer" TEXT NOT NULL,
    "postleitzahl" TEXT NOT NULL,
    "land" TEXT NOT NULL,
    "telefonNr" TEXT NOT NULL
);
INSERT INTO "new_user" ("email", "name") SELECT "email", "name" FROM "user";
DROP TABLE "user";
ALTER TABLE "new_user" RENAME TO "user";
CREATE UNIQUE INDEX "user_name_key" ON "user"("name");
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "warenkorb_userId_key" ON "warenkorb"("userId");
