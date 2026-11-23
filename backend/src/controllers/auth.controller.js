const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const AstrologerProfile = require("../models/astrologerProfile.model");

const STATIC_OTP = "1234";
const OTP_EXPIRY_MINUTES = 5;

// Helper to generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || "default_secret",
    { expiresIn: "7d" }
  );
};

// Helper to format consistent user data for responses
const formatUserData = (user) => {
  if (!user) return null;
  return {
    id: user._id,
    fullName: user.fullName,
    countryCode: user.countryCode || "+91",
    mobile: user.mobile,
    email: user.email || null,
    gender: user.gender || "other",
    // Kundli / Astrology Birth Details
    dob: user.dob || null,
    tob: user.tob || null,
    pob: user.pob || null,
    maritalStatus: user.maritalStatus || null,
    occupation: user.occupation || null,
    topicOfConcern: user.topicOfConcern || null,
    // Address Details
    address: user.address || null,
    city: user.city || null,
    state: user.state || null,
    country: user.country || "India",
    pincode: user.pincode || null,
    role: user.role,
    status: user.status,
    profileImage: user.profileImage || null,
    createdAt: user.createdAt,
  };
};

// 1. Send OTP (Mobile Number Login / Registration)
const sendOtp = async (req, res) => {
  try {
    const { mobile, mobileNumber, countryCode = "+91", fullName } = req.body;
    const userMobile = (mobile || mobileNumber || "").toString().trim();

    if (!userMobile) {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required",
      });
    }

    // Validate 10-digit mobile number
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(userMobile)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 10-digit mobile number",
      });
    }

    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Check if user exists
    let user = await User.findOne({ mobile: userMobile });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = new User({
        fullName: (fullName || "User").trim(),
        mobile: userMobile,
        countryCode: countryCode.trim(),
        role: "user",
        status: "active",
      });
    } else {
      if (countryCode) user.countryCode = countryCode.trim();
    }

    user.otp = STATIC_OTP;
    user.otpExpiresAt = otpExpiry;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `OTP sent successfully. It is valid for ${OTP_EXPIRY_MINUTES} minutes.`,
      isNewUser,
      mobile: userMobile,
      otp: STATIC_OTP, // Static OTP for testing/development
    });
  } catch (error) {
    console.error("Send OTP Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
      error: error.message,
    });
  }
};

// 2. Verify OTP & Login
const verifyOtp = async (req, res) => {
  try {
    const { mobile, mobileNumber, otp } = req.body;
    const userMobile = (mobile || mobileNumber || "").toString().trim();

    if (!userMobile || !otp) {
      return res.status(400).json({
        success: false,
        message: "Mobile number and OTP are required",
      });
    }

    const user = await User.findOne({ mobile: userMobile }).select("+otp");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found. Please request an OTP first.",
      });
    }

    // Check account status
    if (user.status === "blocked" || user.status === "rejected") {
      return res.status(403).json({
        success: false,
        message: `Your account is ${user.status}. Please contact support.`,
      });
    }

    // Check if OTP matches
    if (user.otp !== otp.toString().trim()) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please enter the correct OTP.",
      });
    }

    // Check OTP Expiry
    if (!user.otpExpiresAt || new Date() > user.otpExpiresAt) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP via Resend OTP.",
      });
    }

    // Clear OTP after successful verification
    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();

    // Generate JWT Session Token
    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      data: formatUserData(user),
    });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify OTP",
      error: error.message,
    });
  }
};

// 3. Resend OTP
const resendOtp = async (req, res) => {
  try {
    const { mobile, mobileNumber } = req.body;
    const userMobile = (mobile || mobileNumber || "").toString().trim();

    if (!userMobile) {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required",
      });
    }

    const user = await User.findOne({ mobile: userMobile });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found with this mobile number. Please send OTP first.",
      });
    }

    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    user.otp = STATIC_OTP;
    user.otpExpiresAt = otpExpiry;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `OTP resent successfully. Valid for ${OTP_EXPIRY_MINUTES} minutes.`,
      mobile: userMobile,
      otp: STATIC_OTP,
    });
  } catch (error) {
    console.error("Resend OTP Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to resend OTP",
      error: error.message,
    });
  }
};

// 4. Forgot Password (Request OTP)
const forgotPassword = async (req, res) => {
  try {
    const { mobile, mobileNumber } = req.body;
    const userMobile = (mobile || mobileNumber || "").toString().trim();

    if (!userMobile) {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required",
      });
    }

    const user = await User.findOne({ mobile: userMobile });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No user found with this mobile number",
      });
    }

    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    user.otp = STATIC_OTP;
    user.otpExpiresAt = otpExpiry;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Password reset OTP sent to ${userMobile}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`,
      otp: STATIC_OTP,
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process forgot password request",
      error: error.message,
    });
  }
};

// 5. Reset Password (Verify OTP & Set New Password)
const resetPassword = async (req, res) => {
  try {
    const { mobile, mobileNumber, otp, newPassword, confirmPassword } = req.body;
    const userMobile = (mobile || mobileNumber || "").toString().trim();

    if (!userMobile || !otp || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Mobile, OTP, new password and confirm password are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirm password do not match",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const user = await User.findOne({ mobile: userMobile }).select("+otp +password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.otp !== otp.toString().trim()) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (!user.otpExpiresAt || new Date() > user.otpExpiresAt) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now login with your new password.",
    });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reset password",
      error: error.message,
    });
  }
};

// 6. Session Management / Get Current Logged-in User Profile
const getMe = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Active session verified",
      data: formatUserData(req.user),
    });
  } catch (error) {
    console.error("GetMe Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get user session",
      error: error.message,
    });
  }
};

// 7. Logout
const logoutUser = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Logged out successfully. Please clear token from storage.",
    });
  } catch (error) {
    console.error("Logout Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to logout",
      error: error.message,
    });
  }
};

// 8. Traditional Register (Email / Mobile + Password + Kundli & Address Details)
const registerUser = async (req, res) => {
  try {
    const {
      fullName,
      email,
      mobile,
      mobileNumber,
      countryCode = "+91",
      gender,
      password,
      confirmPassword,
      role = "user",
      // Kundli Details
      dob,
      tob,
      pob,
      maritalStatus,
      occupation,
      topicOfConcern,
      // Address Details
      address,
      city,
      state,
      country = "India",
      pincode,
      // Astrologer Onboarding & Profile Details
      experience,
      experienceUnit,
      skills,
      specialization,
      languages,
      bio,
      about,
      chatPricePerMinute,
      callPricePerMinute,
      documents,
      profileImage,
      alternateMobile,
      isProfileSubmitted,
    } = req.body;

    const userMobile = (mobile || mobileNumber || "").toString().trim();
    const userGender = (gender || "other").toString().toLowerCase();

    if (!fullName || !userMobile || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Full name, mobile number, password and confirm password are required",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Password and confirm password do not match",
      });
    }

    const allowedRoles = ["super_admin", "astrologer", "user"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Allowed roles: ${allowedRoles.join(", ")}`,
      });
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid email address",
        });
      }

      const existingEmail = await User.findOne({
        email: email.toLowerCase().trim(),
      });
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: "Email is already registered",
        });
      }
    }

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(userMobile)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 10 digit mobile number",
      });
    }

    if (!["male", "female", "other"].includes(userGender)) {
      return res.status(400).json({
        success: false,
        message: "Invalid gender. Must be Male, Female, or Other",
      });
    }

    const existingMobile = await User.findOne({
      mobile: userMobile,
    });
    if (existingMobile) {
      return res.status(409).json({
        success: false,
        message: "Mobile number is already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const status = role === "astrologer" ? "pending" : "active";

    // Extract uploaded files from form-data if present
    let uploadedAadhaar = documents?.aadhaarDocument || null;
    let uploadedPan = documents?.panDocument || null;
    let uploadedCert = documents?.certificateDocument || null;
    let uploadedPhoto = profileImage || documents?.profilePhoto || null;

    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        const fileUrl = file.destination.includes("profiles")
          ? `/uploads/profiles/${file.filename}`
          : `/uploads/kyc/${file.filename}`;
        const field = file.fieldname.toLowerCase().trim();

        if (field === "profileimage" || field === "profilephoto" || field === "profile_photo") {
          uploadedPhoto = fileUrl;
        } else if (field === "aadhaardocument" || field === "aadhaar" || field === "idproof" || field === "id_proof") {
          uploadedAadhaar = fileUrl;
        } else if (field === "pandocument" || field === "pan" || field === "pancard" || field === "pan_card") {
          uploadedPan = fileUrl;
        } else if (field === "certificatedocument" || field === "certificate" || field === "astrologycertificate") {
          uploadedCert = fileUrl;
        }
      });
    }

    const effectivePhoto = uploadedPhoto;

    const user = await User.create({
      fullName: fullName.trim(),
      countryCode: countryCode.trim(),
      email: email ? email.toLowerCase().trim() : null,
      mobile: userMobile,
      gender: userGender,
      password: hashedPassword,
      dob: dob || null,
      tob: tob || null,
      pob: pob || null,
      maritalStatus: maritalStatus || null,
      occupation: occupation || null,
      topicOfConcern: topicOfConcern || null,
      address: address || null,
      city: city || null,
      state: state || null,
      country: country || "India",
      pincode: pincode || null,
      profileImage: effectivePhoto,
      role,
      status,
    });

    let astroProfile = null;
    if (role === "astrologer") {
      const parseArray = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        if (typeof val === "string") {
          try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) return parsed;
          } catch (e) {}
          return val.split(",").map((s) => s.trim()).filter(Boolean);
        }
        return [];
      };

      const astroBio = bio || about || "";
      const astroSkills = parseArray(skills);
      const astroLangs = parseArray(languages);
      const isSubmitted = Boolean(
        isProfileSubmitted === true ||
        isProfileSubmitted === "true" ||
        isProfileSubmitted === "1" ||
        uploadedAadhaar ||
        uploadedPan
      );

      astroProfile = await AstrologerProfile.create({
        userId: user._id,
        displayName: user.fullName,
        experience: experience !== undefined ? Number(experience) : 0,
        experienceUnit: experienceUnit || "years",
        skills: astroSkills,
        specialization: parseArray(specialization).length > 0 ? parseArray(specialization) : astroSkills,
        languages: astroLangs,
        bio: astroBio,
        chatPricePerMinute: chatPricePerMinute !== undefined ? Number(chatPricePerMinute) : 20,
        callPricePerMinute: callPricePerMinute !== undefined ? Number(callPricePerMinute) : 25,
        profileImage: effectivePhoto,
        alternateMobile: alternateMobile || null,
        documents: {
          aadhaarDocument: uploadedAadhaar,
          panDocument: uploadedPan,
          certificateDocument: uploadedCert,
          profilePhoto: effectivePhoto,
        },
        kyc: {
          aadhaarFrontImage: uploadedAadhaar,
          panCardImage: uploadedPan,
          status: "pending",
        },
        isProfileSubmitted: isSubmitted,
        submissionStatus: isSubmitted ? "submitted" : "not_submitted",
        verificationStatus: "pending",
      });
    }

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message:
        role === "astrologer"
          ? "Astrologer registration successful. Your account is pending super admin approval."
          : `${role.replace("_", " ").toUpperCase()} registration successful!`,
      token,
      data: formatUserData(user),
      profile: astroProfile,
    });
  } catch (error) {
    console.error("Register Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong during registration",
      error: error.message,
    });
  }
};

// 9. Traditional Login (Email/Mobile + Password)
const loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Email/Mobile and password are required",
      });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();

    const user = await User.findOne({
      $or: [{ email: cleanIdentifier }, { mobile: cleanIdentifier }],
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email/mobile or password",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email/mobile or password",
      });
    }

    if (user.status === "pending") {
      return res.status(403).json({
        success: false,
        message: "Your account is pending approval by super admin.",
      });
    }

    if (user.status === "blocked" || user.status === "rejected") {
      return res.status(403).json({
        success: false,
        message: `Your account is ${user.status}. Please contact support.`,
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      data: formatUserData(user),
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong during login",
      error: error.message,
    });
  }
};

// 10. Update User Profile (Kundli Birth Details & Address)
const updateUserProfile = async (req, res) => {
  try {
    const userId = req.params.userId || (req.user ? req.user._id : null);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const {
      fullName,
      gender,
      email,
      dob,
      tob,
      pob,
      maritalStatus,
      occupation,
      topicOfConcern,
      address,
      city,
      state,
      country,
      pincode,
      profileImage,
    } = req.body;

    if (fullName !== undefined) user.fullName = fullName.trim();
    if (gender !== undefined) user.gender = gender;
    if (email !== undefined) user.email = email ? email.toLowerCase().trim() : null;
    if (dob !== undefined) user.dob = dob;
    if (tob !== undefined) user.tob = tob;
    if (pob !== undefined) user.pob = pob;
    if (maritalStatus !== undefined) user.maritalStatus = maritalStatus;
    if (occupation !== undefined) user.occupation = occupation;
    if (topicOfConcern !== undefined) user.topicOfConcern = topicOfConcern;
    if (address !== undefined) user.address = address;
    if (city !== undefined) user.city = city;
    if (state !== undefined) user.state = state;
    if (country !== undefined) user.country = country;
    if (pincode !== undefined) user.pincode = pincode;
    if (profileImage !== undefined) user.profileImage = profileImage;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User profile updated successfully",
      data: formatUserData(user),
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
};

// 11. Get User Profile by User ID
const getUserProfile = async (req, res) => {
  try {
    const userId = req.params.userId || (req.user ? req.user._id : null);
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: formatUserData(user),
    });
  } catch (error) {
    console.error("Get User Profile Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get user profile",
      error: error.message,
    });
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
  getMe,
  logoutUser,
  registerUser,
  registerAstrologer: registerUser,
  loginUser,
  updateUserProfile,
  getUserProfile,
};
