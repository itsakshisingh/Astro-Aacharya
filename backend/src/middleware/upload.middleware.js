const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Helper to ensure directory exists
const ensureDirExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const profilesDir = path.join(__dirname, "../../uploads/profiles");
const productsDir = path.join(__dirname, "../../uploads/products");
const certificatesDir = path.join(__dirname, "../../uploads/certificates");
const kycDir = path.join(__dirname, "../../uploads/kyc");
const qrDir = path.join(__dirname, "../../uploads/qr");
const paymentsDir = path.join(__dirname, "../../uploads/payments");
const chatsDir = path.join(__dirname, "../../uploads/chats");

ensureDirExists(profilesDir);
ensureDirExists(productsDir);
ensureDirExists(certificatesDir);
ensureDirExists(kycDir);
ensureDirExists(qrDir);
ensureDirExists(paymentsDir);
ensureDirExists(chatsDir);

// Flexible & Resilient File Filter (Images Only)
const fileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|webp|gif|bmp|jfif|svg/i;
  const extname = allowedExtensions.test(
    path.extname(file.originalname).toLowerCase()
  );
  const isImageMime = file.mimetype ? file.mimetype.startsWith("image/") : false;

  if (extname || isImageMime) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files (jpg, jpeg, png, webp, etc.) are allowed!"));
  }
};

// Storage for Profile Images
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profilesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `profile-${uniqueSuffix}${ext}`);
  },
});

// Storage for Product Images
const productStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, productsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `product-${uniqueSuffix}${ext}`);
  },
});

// Storage for Certificate Images
const certificateStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, certificatesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `cert-${uniqueSuffix}${ext}`);
  },
});

// Storage for KYC & Bank Documents (Aadhaar, PAN, Passbook, Cheque - allows PDF and Images)
const kycFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|webp|pdf/i;
  const extname = allowedExtensions.test(
    path.extname(file.originalname).toLowerCase()
  );
  const isImageOrPdf =
    (file.mimetype && file.mimetype.startsWith("image/")) ||
    file.mimetype === "application/pdf";

  if (extname || isImageOrPdf) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files (jpg, png, webp) and PDFs are allowed for KYC documents!"));
  }
};

const kycStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, kycDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `kyc-${uniqueSuffix}${ext}`);
  },
});

const uploadProfile = multer({
  storage: profileStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: fileFilter,
});

const uploadProduct = multer({
  storage: productStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: fileFilter,
});

const uploadCertificate = multer({
  storage: certificateStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: fileFilter,
});

const uploadKYCDocument = multer({
  storage: kycStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB limit
  fileFilter: kycFilter,
});

// Storage for Astrologer Onboarding Files (routes to profiles or kyc folder based on fieldname)
const astrologerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "profileImage" || file.fieldname === "profilePhoto") {
      cb(null, profilesDir);
    } else {
      cb(null, kycDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const prefix = file.fieldname.toLowerCase().replace(/[^a-z0-9]/g, "-") || "doc";
    cb(null, `${prefix}-${uniqueSuffix}${ext}`);
  },
});

const uploadAstrologerDocs = multer({
  storage: astrologerStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB limit
  fileFilter: kycFilter, // Allows images and PDFs
});

// Storage for Payment QR Codes (Uploaded by Admin or Astrologer)
const qrStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, qrDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase() || ".png";
    cb(null, `qr-${uniqueSuffix}${ext}`);
  },
});

const uploadPaymentQr = multer({
  storage: qrStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: fileFilter,
});

// Storage for User Payment Screenshot / Receipts
const paymentReceiptStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, paymentsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `payment-${uniqueSuffix}${ext}`);
  },
});

const uploadPaymentReceipt = multer({
  storage: paymentReceiptStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB limit
  fileFilter: fileFilter,
});

// Storage for Chat Images (sent inside chat sessions)
const chatImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, chatsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `chat-${uniqueSuffix}${ext}`);
  },
});

const uploadChatImage = multer({
  storage: chatImageStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: fileFilter,
});

module.exports = {
  uploadProfile,
  uploadProduct,
  uploadCertificate,
  uploadKYCDocument,
  uploadAstrologerDocs,
  uploadPaymentQr,
  uploadPaymentReceipt,
  uploadChatImage,
};
