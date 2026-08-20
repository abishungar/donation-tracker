const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // Intentionally do not create a default admin. A new installation uses the secure first-run setup screen.

  const groupCount = await prisma.group.count();
  if (groupCount === 0) {
    const group = await prisma.group.create({
      data: { name: "Sample Group A" },
    });

    const managerPassword = "Manager123!";
    const managerHash = await bcrypt.hash(managerPassword, 10);
    const managerUser = await prisma.user.create({
      data: { email: "manager@example.com", password: managerHash, role: "manager", name: "Sam Manager" },
    });
    await prisma.group.update({
      where: { id: group.id },
      data: { managerId: managerUser.id },
    });

    const contact = await prisma.contact.create({
      data: {
        firstName: "Jane",
        lastName: "Doe",
        phone: "555-123-4567",
        email: "jane.doe@example.com",
        groupId: group.id,
      },
    });

    const userPassword = "User123!";
    const userHash = await bcrypt.hash(userPassword, 10);
    await prisma.user.create({
      data: { email: contact.email, password: userHash, role: "user", contactId: contact.id },
    });

    await prisma.donation.create({
      data: {
        amount: 100,
        contactId: contact.id,
        groupId: group.id,
        date: new Date(),
        type: "Online",
      },
    });

    console.log("Seeded sample group, manager, contact, user, and donation.");
    console.log(`  manager@example.com / ${managerPassword}`);
    console.log(`  jane.doe@example.com / ${userPassword}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
