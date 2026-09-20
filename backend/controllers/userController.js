import asyncHandler from "express-async-handler";
import User from "./../models/userModel.js";
import Otp from "./../models/otpModel.js";
import generateToken from "../utils/generateToken.js";
import nodemailer from "nodemailer";

// ─── Helpers ────────────────────────────────────────────────────────────────

const generateOtpCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const sendOtpEmail = async (email, otpCode) => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  // Fall back to console log if SMTP is not configured
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.log(`\n============================`);
    console.log(`[DEV MODE] OTP for ${email}: ${otpCode}`);
    console.log(`============================\n`);
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    await transporter.sendMail({
      from: `"AI_Evalu8 System" <${SMTP_USER}>`,
      to: email,
      subject: "Your AI_Evalu8 Registration OTP",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e0e0e0;border-radius:8px;">
          <h2 style="color:#1976d2;text-align:center;">AI_Evalu8</h2>
          <p style="font-size:16px;color:#333;">Your One-Time Password (OTP) for email verification is:</p>
          <div style="font-size:36px;font-weight:bold;letter-spacing:8px;text-align:center;color:#1976d2;padding:16px 0;">
            ${otpCode}
          </div>
          <p style="font-size:13px;color:#888;">This code expires in <b>5 minutes</b>. Do not share it with anyone.</p>
        </div>
      `,
    });
    console.log(`[EMAIL] OTP sent to ${email} via SMTP`);
  } catch (smtpError) {
    // SMTP failed — fall back to console so registration never breaks
    console.error(`[EMAIL ERROR] SMTP failed: ${smtpError.message}`);
    console.log(`\n============================`);
    console.log(`[FALLBACK] OTP for ${email}: ${otpCode}`);
    console.log(`[FALLBACK] Fix SMTP_PASS in .env to enable email delivery`);
    console.log(`============================\n`);
  }
};

// ─── Controllers ─────────────────────────────────────────────────────────────

// @desc    Send OTP to email before registration
// @route   POST /api/users/send-otp
// @access  Public
const sendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(400);
    throw new Error("An account with this email already exists");
  }

  const otpCode = generateOtpCode();

  // Upsert OTP record (replace if already requested)
  await Otp.findOneAndUpdate(
    { email },
    { otp: otpCode, createdAt: new Date() },
    { upsert: true, new: true }
  );

  await sendOtpEmail(email, otpCode);

  res.status(200).json({ message: "OTP sent successfully. Check your email." });
});

// @desc    Auth user & get token
// @route   POST /api/users/auth
// @access  Public
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    if (!user.isVerified) {
      res.status(401);
      throw new Error("Please verify your email before logging in.");
    }
    if (!user.isApproved) {
      res.status(401);
      throw new Error(
        "Your account is pending approval by the administrator. Please wait."
      );
    }

    generateToken(res, user._id);

    // Phase 1: never return password hash (was previously stored in localStorage)
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      message: "User Successfully login with role: " + user.role,
    });
  } else {
    res.status(401);
    throw new Error("Invalid User email or password ");
  }
});

// @desc    Register a new user (OTP verified)
// @route   POST /api/users  |  POST /api/users/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, otp } = req.body;

  // --- Validate OTP ---
  if (!otp) {
    res.status(400);
    throw new Error("OTP is required. Please verify your email first.");
  }

  const otpRecord = await Otp.findOne({ email });
  if (!otpRecord) {
    res.status(400);
    throw new Error("OTP expired or not found. Please request a new OTP.");
  }
  if (otpRecord.otp !== otp.toString().trim()) {
    res.status(400);
    throw new Error("Invalid OTP. Please check and try again.");
  }

  // OTP valid — clean it up
  await Otp.deleteOne({ email });

  // --- Check duplicate ---
  const userExist = await User.findOne({ email });
  if (userExist) {
    res.status(400);
    throw new Error("User Already Exists");
  }

  // Phase 1: ignore client-sent role — public registration is always student
  const user = await User.create({
    name,
    email,
    password,
    role: "student",
    isVerified: true,
    isApproved: false, // must wait for teacher/admin approval
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      message:
        "Registration successful! Your account is pending admin approval. You will be able to log in once approved.",
    });
  } else {
    res.status(400);
    throw new Error("Invalid User Data");
  }
});

// @desc    Logout user
// @route   POST /api/users/logout
// @access  Private
const logoutUser = asyncHandler(async (req, res) => {
  // Phase 1: match login cookie flags (secure only in production)
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("jwt", "", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "None" : "Lax",
    expires: new Date(0),
  });
  res.status(200).json({ message: " User logout User" });
});

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = {
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
  };
  res.status(200).json(user);
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();
    res.status(200).json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
    });
  } else {
    res.status(404);
    throw new Error("User Not Found");
  }
});

// @desc    Get all pending (unapproved) users
// @route   GET /api/users/pending
// @access  Private (teacher)
const getPendingUsers = asyncHandler(async (req, res) => {
  const pendingUsers = await User.find({ isApproved: false, isVerified: true })
    .select("-password")
    .sort({ createdAt: -1 });
  res.status(200).json(pendingUsers);
});

// @desc    Approve a user registration
// @route   PUT /api/users/approve/:id
// @access  Private (teacher)
const approveUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  user.isApproved = true;
  await user.save();
  res.status(200).json({ message: `User ${user.email} approved successfully.` });
});

// @desc    Reject (delete) a pending user registration
// @route   DELETE /api/users/reject/:id
// @access  Private (teacher)
const rejectUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  await User.deleteOne({ _id: req.params.id });
  res
    .status(200)
    .json({ message: `User ${user.email} registration rejected and removed.` });
});

export {
  authUser,
  registerUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  sendOtp,
  getPendingUsers,
  approveUser,
  rejectUser,
};
