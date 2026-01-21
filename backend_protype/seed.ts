import { PrismaClient } from "./prisma/client/client.ts";

const prisma = new PrismaClient();

function ensureUser(u: {
  name: string;
  email: string;
  passwort: string;
  statusId: number;
  strasse: string;
  hausnummer: string;
  postleitzahl: string;
  land: string;
  telefonNr: string;
}) {
  return prisma.user.upsert({
    where: { name: u.name },
    update: u,
    create: u,
  });
}

async function ensureKategorie(name: string, beschreibung?: string) {
  const found = await prisma.kategorie.findFirst({ where: { name } });
  if (found) return found;
  return prisma.kategorie.create({ data: { name, beschreibung } });
}

async function ensureProdukt(p: {
  name: string;
  beschreibung: string;
  preis: number;
  userId: string;
  selbstabholung: boolean;
  versand: boolean;
  kategorieId: string;
  suchfilterattribute: string;
  status: string;
  bildUrl?: string | null;
}) {
  const found = await prisma.produkte.findFirst({ where: { name: p.name } });
  if (found) return found;
  return prisma.produkte.create({ data: p });
}

async function ensureEinstellungenFor(userId: string) {
  const found = await prisma.einstellungen.findFirst({ where: { userId } });
  if (found) return found;
  return prisma.einstellungen.create({ data: { userId, lightDark: false, schriftgröße: 12 } });
}

async function ensureWarenkorbFor(userId: string) {
  const found = await prisma.warenkorb.findFirst({ where: { userId } });
  if (found) return found;
  return prisma.warenkorb.create({ data: { userId, erstellungsdatum: new Date() } });
}

async function addProductToWarenkorb(warenkorbId: string, produktId: string, menge = 1) {
  // composite PK: warenkorbId + produktId
  const exists = await prisma.warenkorbProdukte.findUnique({
    where: { warenkorbId_produktId: { warenkorbId, produktId } },
  }).catch(() => null);
  if (exists) {
    return prisma.warenkorbProdukte.update({
      where: { warenkorbId_produktId: { warenkorbId, produktId } },
      data: { menge: exists.menge + menge },
    });
  }
  return prisma.warenkorbProdukte.create({ data: { warenkorbId, produktId, menge } });
}

export async function seed() {
  try {
    console.log("Starting seed...");

    const defaultStatusId = 1;

    // Users
    const userA = await ensureUser({
      name: "Ben",
      email: "ben@example.com",
      passwort: "abc123",
      statusId: defaultStatusId,
      strasse: "Musterstraße",
      hausnummer: "1A",
      postleitzahl: "1010",
      land: "AT",
      telefonNr: "+4312345678",
    });

    const userB = await ensureUser({
      name: "Marcel",
      email: "marcel@example.com",
      passwort: "abc123",
      statusId: defaultStatusId,
      strasse: "Hauptstraße",
      hausnummer: "5",
      postleitzahl: "1020",
      land: "AT",
      telefonNr: "+4311122233",
    });

    // Categories (datagroups)
    const catA = await ensureKategorie("Honey", "Rohhonig und Sortenhonig");
    const catB = await ensureKategorie("Beeswax & Apiary", "Bienenwachsprodukte und Imkereibedarf");

    // Products (at least 2 per category)
    const products = [];
    products.push(await ensureProdukt({
      name: "Wildflower Honey - 500g",
      beschreibung: "Aromatischer, naturbelassener Wildblütenhonig aus regionaler Imkerei.",
      preis: 12.5,
      userId: userA.userId,
      selbstabholung: true,
      versand: true,
      kategorieId: catA.kategorieId,
      suchfilterattribute: "honig,wildblüten,regional",
      status: "active",
      bildUrl: null,
    }));

    products.push(await ensureProdukt({
      name: "Lavender Honey - 250g",
      beschreibung: "Feiner Lavendelhonig mit blumigem Aroma, ideal als Brotaufstrich oder in Tee.",
      preis: 9.0,
      userId: userB.userId,
      selbstabholung: false,
      versand: true,
      kategorieId: catA.kategorieId,
      suchfilterattribute: "honig,lavendel,tee",
      status: "active",
      bildUrl: null,
    }));

    products.push(await ensureProdukt({
      name: "Beeswax Candles (2 pack)",
      beschreibung: "Handgegossene Bienenwachskerzen, natürliches Aroma, sauberer Abbrand.",
      preis: 14.99,
      userId: userA.userId,
      selbstabholung: false,
      versand: true,
      kategorieId: catB.kategorieId,
      suchfilterattribute: "bienenwachs,kerzen,nachhaltig",
      status: "active",
      bildUrl: null,
    }));

    products.push(await ensureProdukt({
      name: "Beeswax Wrap - Medium",
      beschreibung: "Wiederverwendbare Bienenwachstücher zur Lebensmittelaufbewahrung.",
      preis: 7.5,
      userId: userB.userId,
      selbstabholung: false,
      versand: true,
      kategorieId: catB.kategorieId,
      suchfilterattribute: "bienenwachs,wrap,verpackung",
      status: "active",
      bildUrl: null,
    }));

    // Settings for users
    await ensureEinstellungenFor(userA.userId);
    await ensureEinstellungenFor(userB.userId);

    // Carts and cart items
    const cartA = await ensureWarenkorbFor(userA.userId);
    const cartB = await ensureWarenkorbFor(userB.userId);

    if (products.length >= 2) {
      await addProductToWarenkorb(cartA.warenkorbId, products[0].produktId, 2);
      await addProductToWarenkorb(cartB.warenkorbId, products[1].produktId, 1);
    }

    console.log("Seeding finished.");
  } catch (err) {
    console.error("Seeding failed:", err);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.main) {
  await seed();
}
