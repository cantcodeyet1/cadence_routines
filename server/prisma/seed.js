import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const morningReset = await prisma.routine.create({
    data: {
      name: "Morning Reset",
      color: "#7C5CFC",
      days: { create: [1, 2, 3, 4, 5].map((weekday) => ({ weekday })) }, // Mon-Fri
      habits: {
        create: [
          { position: 0, required: true, habit: { create: { name: "Drink water", type: "TICK", xpValue: 5, colorTag: "#06B6A4" } } },
          { position: 1, required: true, habit: { create: { name: "Meditate", type: "COUNTDOWN", targetSec: 300, xpValue: 10, colorTag: "#7C5CFC" } } },
          { position: 2, required: true, habit: { create: { name: "Journal", type: "TICK", xpValue: 10, colorTag: "#FF6B35" } } },
          { position: 3, required: false, habit: { create: { name: "Stretch", type: "COUNTUP", xpValue: 10, colorTag: "#06B6A4" } } },
          { position: 4, required: true, habit: { create: { name: "Cold shower", type: "COUNTDOWN", targetSec: 90, xpValue: 10, colorTag: "#4C6EF5" } } },
        ],
      },
    },
  });

  const eveningWindDown = await prisma.routine.create({
    data: {
      name: "Evening Wind-down",
      color: "#4C6EF5",
      days: { create: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday })) }, // every day
      habits: {
        create: [
          { position: 0, required: true, habit: { create: { name: "Read 10 pages", type: "COUNTUP", xpValue: 10, colorTag: "#7C5CFC" } } },
          { position: 1, required: true, habit: { create: { name: "Lights out by 11", type: "TICK", xpValue: 6, colorTag: "#4C6EF5" } } },
        ],
      },
    },
  });

  console.log("Seeded routines:", morningReset.name, "&", eveningWindDown.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
