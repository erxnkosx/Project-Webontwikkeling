import bcrypt from "bcrypt";
import { User } from "../models/User";

export async function seedDefaultUsers() {
  const count = await User.countDocuments();
  if (count > 0) return; 

  const adminHash = await bcrypt.hash("admin123", 10);
  const userHash = await bcrypt.hash("user123", 10);

  await User.create([
    { username: "admin", passwordHash: adminHash, role: "ADMIN" },
    { username: "user", passwordHash: userHash, role: "USER" },
  ]);

  console.log("[seed] Default users added: admin/user");
}
