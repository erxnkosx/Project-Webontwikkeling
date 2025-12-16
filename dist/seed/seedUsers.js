"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDefaultUsers = seedDefaultUsers;
const bcrypt_1 = __importDefault(require("bcrypt"));
const User_1 = require("../models/User");
async function seedDefaultUsers() {
    const count = await User_1.User.countDocuments();
    if (count > 0)
        return;
    const adminHash = await bcrypt_1.default.hash("admin123", 10);
    const userHash = await bcrypt_1.default.hash("user123", 10);
    await User_1.User.create([
        { username: "admin", passwordHash: adminHash, role: "ADMIN" },
        { username: "user", passwordHash: userHash, role: "USER" },
    ]);
    console.log("[seed] Default users added: admin/user");
}
