const AstrologerProfile = require("../models/astrologerProfile.model");
const User = require("../models/user.model");

// 1. Get Astrologer Profile by User ID
const getAstrologerProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    let profile = null;
    if (userId && userId.match(/^[0-9a-fA-F]{24}$/)) {
      profile = await AstrologerProfile.findOne({
        $or: [{ userId }, { _id: userId }],
      }).populate(
        "userId",
        "fullName email mobile gender role status profileImage"
      );
    }

    if (!profile) {
      // Check if User exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (user.role !== "astrologer") {
        return res.status(400).json({
          success: false,
          message: "User is not an astrologer",
        });
      }

      // Auto-create default AstrologerProfile if it didn't exist before
      profile = await AstrologerProfile.create({
        userId: user._id,
        displayName: user.fullName,
        verificationStatus: user.status === "active" ? "verified" : "pending",
      });

      profile = await AstrologerProfile.findById(profile._id).populate(
        "userId",
        "fullName email mobile gender role status profileImage"
      );
    }

    return res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error("Get Profile Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch astrologer profile",
      error: error.message,
    });
  }
};

// 2. Complete / Update Astrologer Profile
const updateAstrologerProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const {
      // Basic Details (From Screenshot 1)
      fullName,
      email,
      mobile,
      gender,

      // Expertise & Profile (From Screenshot 1 & 2)
      displayName,
      professionalTitle,
      bio,
      profileImage,
      coverImage,
      experience,
      experienceUnit,
      specialization,
      skills,
      expertise,
      languages,

      // Price Per Minute (₹) (From Screenshot 2 - Chat & Call only, NO video)
      chatPricePerMinute,
      callPricePerMinute,

      // Document Verification (From Screenshot 3)
      documents,

      // Submission Flag
      isProfileSubmitted,

      // Other Settings & Legacy Fields
      services,
      consultationFee,
      consultationUnit,
      freeConsultation,
      consultationModes,
      education,
      certifications,
      location,
      availability,
      schedule,
      website,
      socialLinks,
      isAcceptingAppointments,
      alternateMobile,
      kyc,
      bankDetails,
    } = req.body;

    // Check if Astrologer Profile exists
    let profile = await AstrologerProfile.findOne({
      $or: [{ userId }, { _id: userId }],
    });

    // Check User
    let user = await User.findById(userId);
    if (!user && profile) {
      user = await User.findById(profile.userId);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Astrologer user not found",
      });
    }

    // Sync basic details to User model if provided
    if (fullName) user.fullName = fullName.trim();
    if (email) user.email = email.trim().toLowerCase();
    if (mobile) user.mobile = mobile.trim();
    if (gender) user.gender = gender.toLowerCase();
    if (profileImage) user.profileImage = profileImage;
    if (documents?.profilePhoto) user.profileImage = documents.profilePhoto;
    await user.save();

    if (!profile) {
      profile = new AstrologerProfile({
        userId: user._id,
        displayName: displayName || user.fullName,
      });
    }

    // Update Profile Fields dynamically
    if (displayName !== undefined) profile.displayName = displayName;
    else if (fullName !== undefined) profile.displayName = fullName.trim();

    if (professionalTitle !== undefined) profile.professionalTitle = professionalTitle;
    if (bio !== undefined) profile.bio = bio;
    if (profileImage !== undefined) profile.profileImage = profileImage;
    if (coverImage !== undefined) profile.coverImage = coverImage;
    if (experience !== undefined) profile.experience = Number(experience);
    if (experienceUnit !== undefined) profile.experienceUnit = experienceUnit;
    if (specialization !== undefined) profile.specialization = specialization;
    if (skills !== undefined) profile.skills = skills;
    if (expertise !== undefined) profile.expertise = expertise;
    if (languages !== undefined) profile.languages = languages;

    // Pricing (Chat & Call per minute)
    if (chatPricePerMinute !== undefined) profile.chatPricePerMinute = Number(chatPricePerMinute);
    if (callPricePerMinute !== undefined) profile.callPricePerMinute = Number(callPricePerMinute);
    if (consultationFee !== undefined) profile.consultationFee = Number(consultationFee);
    if (consultationUnit !== undefined) profile.consultationUnit = consultationUnit;
    if (freeConsultation !== undefined) profile.freeConsultation = freeConsultation;
    if (consultationModes !== undefined) profile.consultationModes = consultationModes;

    // Documents from Screenshot 3
    if (documents !== undefined) {
      profile.documents = {
        ...profile.documents,
        ...documents,
      };
      if (documents.profilePhoto) {
        profile.profileImage = documents.profilePhoto;
      }
    }

    // Submission flag when astrologer clicks "Submit for Verification"
    if (isProfileSubmitted !== undefined) {
      profile.isProfileSubmitted = Boolean(isProfileSubmitted);
      if (isProfileSubmitted) {
        profile.submissionStatus = "submitted";
        profile.verificationStatus = "pending";
      }
    }

    // Other settings
    if (services !== undefined) profile.services = services;
    if (education !== undefined) profile.education = education;
    if (certifications !== undefined) profile.certifications = certifications;
    if (location !== undefined) profile.location = { ...profile.location, ...location };
    if (availability !== undefined) profile.availability = { ...profile.availability, ...availability };
    if (schedule !== undefined) profile.schedule = schedule;
    if (website !== undefined) profile.website = website;
    if (socialLinks !== undefined) profile.socialLinks = { ...profile.socialLinks, ...socialLinks };
    if (isAcceptingAppointments !== undefined) profile.isAcceptingAppointments = isAcceptingAppointments;
    if (alternateMobile !== undefined) profile.alternateMobile = alternateMobile;
    if (kyc !== undefined) profile.kyc = { ...profile.kyc, ...kyc };
    if (bankDetails !== undefined) profile.bankDetails = { ...profile.bankDetails, ...bankDetails };

    await profile.save();

    const populated = await AstrologerProfile.findById(profile._id).populate(
      "userId",
      "fullName email mobile gender role status profileImage"
    );

    return res.status(200).json({
      success: true,
      message: "Astrologer profile updated successfully",
      data: populated,
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update astrologer profile",
      error: error.message,
    });
  }
};

// 3. Get All Verified & Active Astrologers (For Public / User Website)
const getPublicAstrologers = async (req, res) => {
  try {
    let astrologers = await AstrologerProfile.find({
      isActive: true,
      verificationStatus: "verified",
    }).populate("userId", "fullName email mobile gender profileImage status");

    if (!astrologers || astrologers.length === 0) {
      astrologers = await AstrologerProfile.find().populate(
        "userId",
        "fullName email mobile gender profileImage status"
      );
    }

    return res.status(200).json({
      success: true,
      count: astrologers.length,
      data: astrologers,
    });
  } catch (error) {
    console.error("Get Public Astrologers Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch astrologers",
      error: error.message,
    });
  }
};

// 4. Submit / Update KYC Details (Aadhaar & PAN)
const submitKYC = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      aadhaarNumber,
      aadhaarFrontImage,
      aadhaarBackImage,
      panNumber,
      panCardImage,
    } = req.body;

    let profile = await AstrologerProfile.findOne({
      $or: [{ userId }, { _id: userId }],
    });

    if (!profile) {
      const user = await User.findById(userId);
      if (!user || user.role !== "astrologer") {
        return res.status(404).json({
          success: false,
          message: "Astrologer not found",
        });
      }
      profile = new AstrologerProfile({ userId, displayName: user.fullName });
    }

    profile.kyc = {
      ...profile.kyc,
      aadhaarNumber: aadhaarNumber || profile.kyc?.aadhaarNumber,
      aadhaarFrontImage: aadhaarFrontImage || profile.kyc?.aadhaarFrontImage,
      aadhaarBackImage: aadhaarBackImage || profile.kyc?.aadhaarBackImage,
      panNumber: panNumber ? panNumber.toUpperCase() : profile.kyc?.panNumber,
      panCardImage: panCardImage || profile.kyc?.panCardImage,
      status: "pending",
      rejectionReason: null,
    };

    await profile.save();

    return res.status(200).json({
      success: true,
      message: "KYC details submitted successfully. Under review by admin.",
      data: profile.kyc,
    });
  } catch (error) {
    console.error("Submit KYC Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit KYC details",
      error: error.message,
    });
  }
};

// 5. Update Bank & Payout Details
const updateBankDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      accountHolderName,
      accountNumber,
      ifscCode,
      bankName,
      branchName,
      passbookOrChequeImage,
      upiId,
    } = req.body;

    let profile = await AstrologerProfile.findOne({
      $or: [{ userId }, { _id: userId }],
    });

    if (!profile) {
      const user = await User.findById(userId);
      if (!user || user.role !== "astrologer") {
        return res.status(404).json({
          success: false,
          message: "Astrologer not found",
        });
      }
      profile = new AstrologerProfile({ userId, displayName: user.fullName });
    }

    profile.bankDetails = {
      ...profile.bankDetails,
      accountHolderName: accountHolderName || profile.bankDetails?.accountHolderName,
      accountNumber: accountNumber || profile.bankDetails?.accountNumber,
      ifscCode: ifscCode ? ifscCode.toUpperCase() : profile.bankDetails?.ifscCode,
      bankName: bankName || profile.bankDetails?.bankName,
      branchName: branchName || profile.bankDetails?.branchName,
      passbookOrChequeImage: passbookOrChequeImage || profile.bankDetails?.passbookOrChequeImage,
      upiId: upiId || profile.bankDetails?.upiId,
    };

    await profile.save();

    return res.status(200).json({
      success: true,
      message: "Bank details updated successfully",
      data: profile.bankDetails,
    });
  } catch (error) {
    console.error("Update Bank Details Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update bank details",
      error: error.message,
    });
  }
};

// 6. Admin Verify / Reject KYC
const verifyKYCStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, rejectionReason, isBankVerified } = req.body;

    if (!["pending", "verified", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'pending', 'verified', or 'rejected'",
      });
    }

    const profile = await AstrologerProfile.findOne({
      $or: [{ userId }, { _id: userId }],
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Astrologer profile not found",
      });
    }

    profile.kyc.status = status;
    if (status === "rejected") {
      profile.kyc.rejectionReason = rejectionReason || "Documents not clear or invalid";
    } else if (status === "verified") {
      profile.kyc.rejectionReason = null;
      profile.verificationStatus = "verified";
      profile.verifiedAt = new Date();
    }

    if (isBankVerified !== undefined) {
      profile.bankDetails.isBankVerified = isBankVerified;
    }

    await profile.save();

    return res.status(200).json({
      success: true,
      message: `KYC status updated to '${status}' successfully`,
      data: {
        kyc: profile.kyc,
        verificationStatus: profile.verificationStatus,
        bankDetails: profile.bankDetails,
      },
    });
  } catch (error) {
    console.error("Verify KYC Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update KYC verification status",
      error: error.message,
    });
  }
};

module.exports = {
  getAstrologerProfile,
  updateAstrologerProfile,
  getPublicAstrologers,
  submitKYC,
  updateBankDetails,
  verifyKYCStatus,
};
