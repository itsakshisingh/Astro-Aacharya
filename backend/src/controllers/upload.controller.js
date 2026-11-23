const User = require("../models/user.model");
const AstrologerProfile = require("../models/astrologerProfile.model");
const Product = require("../models/product.model");
const jwt = require("jsonwebtoken");

// Helper to extract userId from req.body or Authorization Bearer token
const extractUserId = (req) => {
  if (req.body && req.body.userId) {
    return req.body.userId;
  }
  if (req.headers && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret");
      return decoded.id;
    } catch (e) {
      return null;
    }
  }
  return null;
};

// 1. Upload Profile Image
const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select an image file to upload",
      });
    }

    const imageUrl = `/uploads/profiles/${req.file.filename}`;
    const fullUrl = `${req.protocol}://${req.get("host")}${imageUrl}`;

    const userId = extractUserId(req);

    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        user.profileImage = imageUrl;
        await user.save();

        if (user.role === "astrologer") {
          await AstrologerProfile.findOneAndUpdate(
            { userId: user._id },
            {
              profileImage: imageUrl,
              "documents.profilePhoto": imageUrl,
            }
          );
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: "Profile image uploaded successfully",
      data: {
        filename: req.file.filename,
        imageUrl: imageUrl,
        fullUrl: fullUrl,
        linkedUserId: userId || null,
      },
    });
  } catch (error) {
    console.error("Profile Upload Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error uploading profile image",
      error: error.message,
    });
  }
};

// 2. Upload Single Product Image
const uploadSingleProductImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select a product image file to upload",
      });
    }

    const imageUrl = `/uploads/products/${req.file.filename}`;
    const fullUrl = `${req.protocol}://${req.get("host")}${imageUrl}`;

    const { productId } = req.body;

    if (productId) {
      await Product.findByIdAndUpdate(productId, {
        $push: { images: imageUrl },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product image uploaded successfully",
      data: {
        filename: req.file.filename,
        imageUrl: imageUrl,
        fullUrl: fullUrl,
      },
    });
  } catch (error) {
    console.error("Product Image Upload Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error uploading product image",
      error: error.message,
    });
  }
};

// 3. Upload Multiple Product Images (Up to 5)
const uploadMultipleProductImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select product image files to upload",
      });
    }

    const uploadedImages = req.files.map((file) => {
      const imageUrl = `/uploads/products/${file.filename}`;
      const fullUrl = `${req.protocol}://${req.get("host")}${imageUrl}`;
      return {
        filename: file.filename,
        imageUrl,
        fullUrl,
      };
    });

    const imageUrls = uploadedImages.map((img) => img.imageUrl);

    const { productId } = req.body;
    if (productId) {
      await Product.findByIdAndUpdate(productId, {
        $push: { images: { $each: imageUrls } },
      });
    }

    return res.status(200).json({
      success: true,
      message: `${uploadedImages.length} Product images uploaded successfully`,
      data: {
        images: uploadedImages,
        imageUrls: imageUrls,
      },
    });
  } catch (error) {
    console.error("Multiple Product Upload Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error uploading product images",
      error: error.message,
    });
  }
};

// 4. Upload Certificate Images (Multiple, unlimited per call)
const uploadCertificateImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one certificate image to upload",
      });
    }

    const uploadedImages = req.files.map((file) => {
      const imageUrl = `/uploads/certificates/${file.filename}`;
      const fullUrl = `${req.protocol}://${req.get("host")}${imageUrl}`;
      return { filename: file.filename, imageUrl, fullUrl };
    });

    return res.status(200).json({
      success: true,
      message: `${uploadedImages.length} certificate image(s) uploaded successfully`,
      data: {
        images: uploadedImages,
        imageUrls: uploadedImages.map((img) => img.imageUrl),
        fullUrls: uploadedImages.map((img) => img.fullUrl),
      },
    });
  } catch (error) {
    console.error("Certificate Upload Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error uploading certificate images",
      error: error.message,
    });
  }
};

// 5. Upload KYC / Banking Document (Aadhaar, PAN, Passbook, Cheque)
const uploadKYCDoc = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select a KYC document file to upload",
      });
    }

    const fileUrl = `/uploads/kyc/${req.file.filename}`;
    const fullUrl = `${req.protocol}://${req.get("host")}${fileUrl}`;

    const userId = extractUserId(req);
    const documentType = (req.body.documentType || req.body.type || "").toLowerCase().trim();

    if (userId) {
      const updateData = {};
      if (documentType === "aadhaar" || documentType === "id_proof") {
        updateData["documents.aadhaarDocument"] = fileUrl;
        updateData["kyc.aadhaarFrontImage"] = fileUrl;
      } else if (documentType === "pan") {
        updateData["documents.panDocument"] = fileUrl;
        updateData["kyc.panCardImage"] = fileUrl;
      } else if (documentType === "certificate") {
        updateData["documents.certificateDocument"] = fileUrl;
      } else if (documentType === "profilephoto" || documentType === "profile_photo") {
        updateData["documents.profilePhoto"] = fileUrl;
        updateData["profileImage"] = fileUrl;
        await User.findByIdAndUpdate(userId, { profileImage: fileUrl });
      }

      if (Object.keys(updateData).length > 0) {
        await AstrologerProfile.findOneAndUpdate(
          { userId },
          { $set: updateData }
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: "KYC document uploaded successfully",
      data: {
        filename: req.file.filename,
        fileUrl: fileUrl,
        fullUrl: fullUrl,
        mimetype: req.file.mimetype,
        linkedUserId: userId || null,
        documentType: documentType || null,
      },
    });
  } catch (error) {
    console.error("KYC Document Upload Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error uploading KYC document",
      error: error.message,
    });
  }
};

module.exports = {
  uploadProfileImage,
  uploadSingleProductImage,
  uploadMultipleProductImages,
  uploadCertificateImages,
  uploadKYCDoc,
};
