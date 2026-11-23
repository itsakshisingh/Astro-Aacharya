const express = require("express");
const router = express.Router();
const Consultation = require("../models/consultation.model");
const AstrologerProfile = require("../models/astrologerProfile.model");

// 1. Get Live Status of All Astrologers (Online, Busy, Offline)
router.get("/live-astrologers", async (req, res) => {
  try {
    const profiles = await AstrologerProfile.find(
      { isActive: true },
      "userId displayName professionalTitle profileImage availability rating totalConsultations"
    ).populate("userId", "fullName mobile email");

    const formatted = profiles.map((p) => ({
      astrologerId: p.userId?._id || p.userId,
      displayName: p.displayName || p.userId?.fullName,
      profileImage: p.profileImage,
      professionalTitle: p.professionalTitle,
      status: p.availability?.status || "offline", // "online" | "busy" | "offline"
      label:
        p.availability?.status === "online"
          ? "Available"
          : p.availability?.status === "busy"
          ? "On Another Call"
          : "Offline",
      isOnline: p.availability?.isOnline || false,
    }));

    return res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    console.error("Live Astrologers Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch live astrologers",
      error: error.message,
    });
  }
});

// 2. Get Consultation History by User or Astrologer ID
router.get("/history/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const consultations = await Consultation.find({
      $or: [{ userId: id }, { astrologerId: id }],
    })
      .sort({ createdAt: -1 })
      .populate("userId", "fullName mobile email")
      .populate("astrologerId", "fullName email");

    return res.status(200).json({
      success: true,
      count: consultations.length,
      data: consultations,
    });
  } catch (error) {
    console.error("Consultation History Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch consultation history",
      error: error.message,
    });
  }
});

// 3. Get Single Consultation Details with Messages
router.get("/:id", async (req, res) => {
  try {
    const consultation = await Consultation.findById(req.params.id)
      .populate("userId", "fullName mobile email")
      .populate("astrologerId", "fullName email");

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: "Consultation not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: consultation,
    });
  } catch (error) {
    console.error("Consultation Details Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch consultation details",
      error: error.message,
    });
  }
});

module.exports = router;
