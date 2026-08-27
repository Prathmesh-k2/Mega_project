import mongoose from "mongoose";
import User from "../models/userModel.js";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log(`MongoDB Connected:`);

    // Migration: auto-approve all existing users that don't have approval flags
    const migrateResult = await User.updateMany(
      { isApproved: { $exists: false } },
      { $set: { isApproved: true, isVerified: true } }
    );
    if (migrateResult.modifiedCount > 0) {
      console.log(
        `Migration: ${migrateResult.modifiedCount} existing user(s) auto-approved.`
      );
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
