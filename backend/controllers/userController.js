import asyncHandler from "express-async-handler";
import User from "./../models/userModel.js";
import Otp from "./../models/otpModel.js";
import generateToken from "../utils/generateToken.js";
import nodemailer from "nodemailer";

// ─── Helpers ────────────────────────────────────────────────────────────────

const generateOtpCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const sendOtpEmail = async (email, otpCode, purpose = "REGISTRATION") => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[DEV MODE] SMTP is not configured; OTP for ${email}: ${otpCode}`);
      return;
    }
    throw new Error("Email delivery is not configured on the server");
  }

  const port = Number(SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    auth: {
      user: SMTP_USER,
      // Gmail app passwords are often copied with spaces; SMTP accepts the compact form.
      pass: SMTP_PASS.replace(/\s/g, ""),
    },
  });

  const subject = purpose === "PASSWORD_RESET"
    ? "Your AI_Evalu8 password reset OTP"
    : "Your AI_Evalu8 Registration OTP";
  const description = purpose === "PASSWORD_RESET"
    ? "Your One-Time Password (OTP) to reset your AI_Evalu8 password is:"
    : "Your One-Time Password (OTP) for email verification is:";

  await transporter.sendMail({
    from: `"AI_Evalu8 System" <${SMTP_USER}>`,
    to: email,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e0e0e0;border-radius:8px;">
        <h2 style="color:#1976d2;text-align:center;">AI_Evalu8</h2>
        <p style="font-size:16px;color:#333;">${description}</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;text-align:center;color:#1976d2;padding:16px 0;">
          ${otpCode}
        </div>
        <p style="font-size:13px;color:#888;">This code expires in <b>5 minutes</b>. Do not share it with anyone.</p>
      </div>
    `,
  });
  console.log(`[EMAIL] OTP sent to ${email} via SMTP`);
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

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    res.status(400);
    throw new Error("An account with this email already exists");
  }

  const otpCode = generateOtpCode();

  try {
    await sendOtpEmail(normalizedEmail, otpCode, "REGISTRATION");
  } catch (smtpError) {
    console.error("[EMAIL ERROR] OTP delivery failed:", {
      code: smtpError.code,
      responseCode: smtpError.responseCode,
      message: smtpError.message,
    });
    res.status(502);
    throw new Error("OTP email could not be sent. Check the email service configuration and try again.");
  }

  // Store the OTP only after the provider accepted the message.
  await Otp.findOneAndUpdate(
    { email: normalizedEmail },
    { otp: otpCode, purpose: "REGISTRATION", createdAt: new Date() },
    { upsert: true, new: true }
  );

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

// @desc    Guest login to bypass authentication
// @route   POST /api/users/guest
// @access  Public
const guestLogin = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!role || (role !== 'student' && role !== 'admin')) {
    res.status(400);
    throw new Error('Valid role (student or admin) is required for guest login');
  }

  const email = role === 'admin' ? 'guest_admin@demo.com' : 'guest_student@demo.com';
  let user = await User.findOne({ email });

  // Insert data into database if it doesn't exist
  if (!user) {
    user = await User.create({
      name: role === 'admin' ? 'Demo Admin' : 'Demo Student',
      email: email,
      password: 'GuestPassword123!', // strong dummy password
      role: role,
      isVerified: true,
      isApproved: true, 
    });
  }

  generateToken(res, user._id);

  res.status(200).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    message: "Guest Login Successful with role: " + user.role,
  });
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

  const normalizedEmail = String(email || "").trim().toLowerCase();
  const otpRecord = await Otp.findOne({ email: normalizedEmail, purpose: "REGISTRATION" });
  if (!otpRecord) {
    res.status(400);
    throw new Error("OTP expired or not found. Please request a new OTP.");
  }
  if (otpRecord.otp !== otp.toString().trim()) {
    res.status(400);
    throw new Error("Invalid OTP. Please check and try again.");
  }

  // OTP valid — clean it up
  await Otp.deleteOne({ email: normalizedEmail, purpose: "REGISTRATION" });

  // --- Check duplicate ---
  const userExist = await User.findOne({ email: normalizedEmail });
  if (userExist) {
    res.status(400);
    throw new Error("User Already Exists");
  }

  // Phase 1: ignore client-sent role — public registration is always student
  const user = await User.create({
    name,
    email: normalizedEmail,
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

// @desc Send a password-reset OTP
// @route POST /api/users/forgot-password
// @access Public
const sendPasswordResetOtp = asyncHandler(async (req, res) => {
  const normalizedEmail = String(req.body.email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    res.status(400);
    throw new Error("Email is required");
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(200).json({
      message: "If an account exists for this email, a password reset OTP has been sent.",
    });
  }

  const otpCode = generateOtpCode();
  try {
    await sendOtpEmail(normalizedEmail, otpCode, "PASSWORD_RESET");
  } catch (smtpError) {
    console.error("[EMAIL ERROR] Password reset OTP delivery failed:", {
      code: smtpError.code,
      responseCode: smtpError.responseCode,
      message: smtpError.message,
    });
    res.status(502);
    throw new Error("Password reset email could not be sent. Please try again later.");
  }

  await Otp.findOneAndUpdate(
    { email: normalizedEmail },
    { otp: otpCode, purpose: "PASSWORD_RESET", createdAt: new Date() },
    { upsert: true, new: true },
  );

  res.status(200).json({
    message: "If an account exists for this email, a password reset OTP has been sent.",
  });
});

// @desc Reset a password using a password-reset OTP
// @route POST /api/users/reset-password
// @access Public
const resetPassword = asyncHandler(async (req, res) => {
  const normalizedEmail = String(req.body.email || "").trim().toLowerCase();
  const otp = String(req.body.otp || "").trim();
  const password = String(req.body.password || "");

  if (!normalizedEmail || !/^\d{6}$/.test(otp) || password.length < 6) {
    res.status(400);
    throw new Error("Email, a valid 6-digit OTP, and a password of at least 6 characters are required");
  }

  const otpRecord = await Otp.findOne({
    email: normalizedEmail,
    otp,
    purpose: "PASSWORD_RESET",
  });
  if (!otpRecord) {
    res.status(400);
    throw new Error("Invalid or expired password reset OTP");
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    res.status(400);
    throw new Error("Invalid or expired password reset OTP");
  }

  user.password = password;
  await user.save();
  await Otp.deleteOne({ _id: otpRecord._id });
  res.status(200).json({ message: "Password reset successfully. You can now sign in." });
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
  guestLogin,
  registerUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  sendOtp,
  sendPasswordResetOtp,
  resetPassword,
  getPendingUsers,
  approveUser,
  rejectUser,
};
