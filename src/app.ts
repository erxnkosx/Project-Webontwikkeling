import * as fs from "fs";
import { createInterface } from "readline/promises";
import { stdin as input, stdout as output } from "process";

// JSON inlezen (simpel: relatieve paden vanaf projectroot)
const players = JSON.parse(fs.readFileSync("src/data/players.json", "utf-8"));
const clubs   = JSON.parse(fs.readFileSync("src/data/clubs.json",   "utf-8"));

const rl = createInterface({ input, output });

async function main() {
  console.log("Welcome to the JSON data viewer!\n");

  let running = true;
  while (running) {
    console.log("1. View all data");
    console.log("2. Filter by ID");
    console.log("3. Exit\n");

    const choice = (await rl.question("Please enter your choice: ")).trim();
    console.log();

    switch (choice) {
      case "1": {
        players.forEach((p: any) => console.log(`- ${p.name} (${p.id})`));
        console.log();
        break;
      }

      case "2": {
        const id = (await rl.question("Please enter the ID you want to filter by: ")).trim();
        console.log();

        const p = players.find((x: any) => String(x.id).toLowerCase() === id.toLowerCase());
        if (p) {
          const skills = (p.skills || []).join(", ");
          const club   = p.club || { name: "", id: "" };

          console.log(`- ${p.name} (${p.id})`);
          console.log(`  - Description: ${p.description}`);
          console.log(`  - Age: ${p.age}`);
          console.log(`  - Active: ${p.isBasisspeler}`);
          console.log(`  - Birthdate: ${p.birthDate}`);
          console.log(`  - Image: ${p.imageUrl}`);
          console.log(`  - Position: ${p.position}`);
          console.log(`  - PositionType: ${p.positionType}`);
          console.log("  - Skills: " + skills);
          console.log("  - Club: " + club.name + " (" + club.id + ")\n");
          break;
        }

        const c = clubs.find((x: any) => String(x.id).toLowerCase() === id.toLowerCase());
        if (c) {
          console.log(`- ${c.name} (${c.id})`);
          console.log(`  - Stadium: ${c.stadium}`);
          console.log(`  - Founded: ${c.foundedYear}`);
          console.log(`  - Coach: ${c.coach}`);
          console.log(`  - Country: ${c.country}`);
          console.log(`  - Logo: ${c.logoUrl}\n`);
        } else {
          console.log(`No item found with id "${id}".\n`);
        }
        break;
      }

      case "3":
        running = false;
        break;

      default:
        console.log("Invalid choice. Please select 1, 2, or 3.\n");
        break;
    }
  }

  await rl.close();
  console.log("Programma wordt afgesloten, goodbye!");
}

main();
