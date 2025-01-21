const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const tracks = Array.from({ length: 20 }, (_, i) => ({
    title: `Track ${i + 1}`,
    artist: `Artist ${i + 1}`,
  }));

  await prisma.track.createMany({ data: tracks });
}

main()
  .then(() => {
    prisma.$disconnect();
  })
  .catch((err) => {
    console.error(err);
    prisma.$disconnect();
  });
