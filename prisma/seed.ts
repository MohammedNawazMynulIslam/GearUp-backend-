import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "../prisma/generated/prisma/client";
import config from "../src/config";

const ADMIN_EMAIL = "admin@gearup.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin12345";

const seedAdmin = async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set in the environment");
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const existingAdmin = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
      select: { id: true },
    });

    if (existingAdmin) {
      console.log(`Admin already exists with email ${ADMIN_EMAIL}. Skipping.`);
      return;
    }

    const hashedPassword = await bcrypt.hash(
      ADMIN_PASSWORD,
      config.BCRYPT_SALT_ROUNDS
    );

    const admin = await prisma.user.create({
      data: {
        name: "Super Admin",
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: Role.ADMIN,
      },
      select: { id: true, email: true, role: true },
    });

    console.log(`Admin created successfully:`, admin);
  } finally {
    await prisma.$disconnect();
  }
};

seedAdmin().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});