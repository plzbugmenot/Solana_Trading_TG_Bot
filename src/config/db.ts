import mongoose from "mongoose";
import { MONGO_URL, userService } from "./config";

export async function connectDatabase() {
  try {
    await mongoose.connect(MONGO_URL);
    console.log("🏬 Connected to MongoDB");
    // console.log(userService.getAllAutoSettingsArray());
  } catch (error) {
    console.error("MongoDB connection error:", error);
    // process.exit(1);
  }
}
