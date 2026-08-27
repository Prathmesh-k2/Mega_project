import mongoose from "mongoose";

const otpSchema = mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300, // TTL: auto-delete after 5 minutes
  },
});

const Otp = mongoose.model("Otp", otpSchema);

export default Otp;
