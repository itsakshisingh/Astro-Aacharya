# Jyotara Astrology Website - Astrologer API Integration Guide

**Base URL:** `https://astrobackend.bhoomitechzone.shop`

---

## 📑 Table of Contents
1. [Authentication & Registration](#1-authentication--registration)
2. [Astrologer Profile & Document Upload](#2-astrologer-profile--document-upload)
3. [Bank Details & KYC Submission](#3-bank-details--kyc-submission)
4. [Public Astrologers & Live Presence (User-Facing)](#4-public-astrologers--live-presence-user-facing)
5. [Appointments Management](#5-appointments-management)
6. [Consultation History & Chat Details](#6-consultation-history--chat-details)
7. [Astrologer Payment QR & Receipt Verification](#7-astrologer-payment-qr--receipt-verification)
8. [Admin Approval & KYC Verification](#8-admin-approval--kyc-verification)

---

## 1. Authentication & Registration

### 1.1 Send OTP to Mobile
Send a 4-digit verification OTP (Static: `1234`) to the mobile number before registration or for OTP login.

```bash
curl --location 'https://astrobackend.bhoomitechzone.shop/api/auth/send-otp' \
--header 'Content-Type: application/json' \
--data '{
    "mobile": "9876543210",
    "countryCode": "+91"
}'
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully. It is valid for 5 minutes.",
  "isNewUser": true,
  "mobile": "9876543210",
  "otp": "1234"
}
```

---

### 1.2 Verify Mobile OTP
Verifies the OTP. If the astrologer is new, mobile is marked as verified for registration.

```bash
curl --location 'https://astrobackend.bhoomitechzone.shop/api/auth/verify-otp' \
--header 'Content-Type: application/json' \
--data '{
    "mobile": "9876543210",
    "otp": "1234"
}'
```

**Response (New Astrologer):**
```json
{
  "success": true,
  "message": "Mobile number verified successfully. You can now complete your registration.",
  "isNewUser": true,
  "isMobileVerified": true,
  "verifiedMobile": "9876543210"
}
```

---

### 1.3 Astrologer Registration (With Profile Setup & Documents)
Registers a new Astrologer account. Account status starts as `pending` until approved by Admin. Supports direct file uploads via `multipart/form-data`.

```bash
curl --location 'https://astrobackend.bhoomitechzone.shop/api/auth/register' \
--form 'fullName="Acharya Dev Sharma"' \
--form 'mobile="9876543210"' \
--form 'countryCode="+91"' \
--form 'email="acharyadev@gmail.com"' \
--form 'gender="male"' \
--form 'password="Password@123"' \
--form 'confirmPassword="Password@123"' \
--form 'role="astrologer"' \
--form 'experience="8"' \
--form 'experienceUnit="years"' \
--form 'skills="Vedic,Numerology,Vastu,Prashna"' \
--form 'languages="Hindi,English,Sanskrit"' \
--form 'chatPricePerMinute="20"' \
--form 'callPricePerMinute="25"' \
--form 'bio="Certified Vedic Astrologer with 8+ years of experience helping clients in Career, Marriage and Vastu."' \
--form 'profileImage=@"/path/to/profile-photo.jpg"' \
--form 'aadhaarDocument=@"/path/to/aadhaar.jpg"' \
--form 'panDocument=@"/path/to/pan.jpg"' \
--form 'certificateDocument=@"/path/to/astrology-certificate.jpg"'
```

**Response:**
```json
{
  "success": true,
  "message": "Astrologer registration successful. Your account is pending super admin approval.",
  "token": "eyJhbGciOi...",
  "data": {
    "id": "6b05...",
    "fullName": "Acharya Dev Sharma",
    "mobile": "9876543210",
    "email": "acharyadev@gmail.com",
    "role": "astrologer",
    "status": "pending",
    "isMobileVerified": true
  }
}
```

---

### 1.4 Astrologer Login (Password)
```bash
curl --location 'https://astrobackend.bhoomitechzone.shop/api/auth/login' \
--header 'Content-Type: application/json' \
--data '{
    "identifier": "9876543210",
    "password": "Password@123"
}'
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOi...",
  "data": {
    "id": "6b05...",
    "fullName": "Acharya Dev Sharma",
    "mobile": "9876543210",
    "role": "astrologer",
    "status": "active"
  }
}
```

---

## 2. Astrologer Profile & Document Upload

### 2.1 Get Astrologer Profile Details
Fetches full profile, pricing, documents, ratings, and KYC status.

```bash
curl --location 'https://astrobackend.bhoomitechzone.shop/api/astrologer/profile/ASTROLOGER_USER_ID'
```

---

### 2.2 Update Astrologer Profile & Pricing (`multipart/form-data`)
Astrologer updates their fees, bio, skills, or uploads new documents from their dashboard.

```bash
curl --location --request PUT 'https://astrobackend.bhoomitechzone.shop/api/astrologer/profile/ASTROLOGER_USER_ID' \
--form 'displayName="Acharya Dev Sharma"' \
--form 'professionalTitle="Senior Vedic & Vastu Expert"' \
--form 'experience="10"' \
--form 'chatPricePerMinute="25"' \
--form 'callPricePerMinute="30"' \
--form 'skills="Vedic,KP Astrology,Numerology,Vastu,Face Reading"' \
--form 'languages="Hindi,English,Gujarati"' \
--form 'bio="Updated bio: Over 10 years guiding clients through Vedic Astrology, Kundli Dosha, and Career remedies."' \
--form 'profileImage=@"/path/to/new-photo.jpg"' \
--form 'aadhaarDocument=@"/path/to/aadhaar-card.jpg"' \
--form 'panDocument=@"/path/to/pan-card.jpg"' \
--form 'certificateDocument=@"/path/to/gold-medal-certificate.jpg"' \
--form 'isProfileSubmitted="true"'
```

---

## 3. Bank Details & KYC Submission

### 3.1 Update Bank & Payout Details
Astrologer enters their bank account or UPI details for consultation earnings payout.

```bash
curl --location --request PUT 'https://astrobackend.bhoomitechzone.shop/api/astrologer/bank-details/ASTROLOGER_USER_ID' \
--header 'Content-Type: application/json' \
--data '{
    "accountHolderName": "Dev Sharma",
    "accountNumber": "987654321012",
    "ifscCode": "SBIN0001234",
    "bankName": "State Bank of India",
    "branchName": "Varanasi Main Branch",
    "upiId": "acharyadev@oksbi"
}'
```

---

### 3.2 Submit KYC Document Details
```bash
curl --location --request PUT 'https://astrobackend.bhoomitechzone.shop/api/astrologer/kyc/ASTROLOGER_USER_ID' \
--form 'aadhaarNumber="123456789012"' \
--form 'panNumber="ABCDE1234F"' \
--form 'aadhaarFrontImage=@"/path/to/aadhaar-front.jpg"' \
--form 'panCardImage=@"/path/to/pancard.jpg"'
```

---

## 4. Public Astrologers & Live Presence (User-Facing)

### 4.1 Get All Active & Verified Astrologers
Use this API on the website homepage or "Talk to Astrologer" page to list all verified pandits.

```bash
curl --location 'https://astrobackend.bhoomitechzone.shop/api/astrologer/public'
```

**Response (Sample):**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "astrologerId": "6b05...",
      "displayName": "Acharya Dev Sharma",
      "professionalTitle": "Senior Vedic & Vastu Expert",
      "experience": 10,
      "skills": ["Vedic", "KP Astrology", "Numerology"],
      "languages": ["Hindi", "English"],
      "chatPricePerMinute": 25,
      "callPricePerMinute": 30,
      "profileImage": "/uploads/profiles/profile-xxx.jpg",
      "rating": 4.9,
      "totalReviews": 120,
      "isOnline": true
    }
  ]
}
```

---

### 4.2 Live Astrologers Presence Status (Online / Busy / Offline)
Real-time indicator showing which astrologer is currently Available, On Call, or Offline.

```bash
curl --location 'https://astrobackend.bhoomitechzone.shop/api/consultations/live-astrologers'
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "astrologerId": "6b05...",
      "displayName": "Acharya Dev Sharma",
      "status": "online",
      "label": "Available",
      "isOnline": true
    },
    {
      "astrologerId": "6b06...",
      "displayName": "Pandit Ramesh Shastri",
      "status": "busy",
      "label": "On Another Call",
      "isOnline": true
    }
  ]
}
```

---

## 5. Appointments Management

### 5.1 Book an Appointment (User Books Pandit Ji)
```bash
curl --location 'https://astrobackend.bhoomitechzone.shop/api/appointments/book' \
--header 'Content-Type: application/json' \
--data '{
    "userId": "USER_ID_HERE",
    "astrologerId": "ASTROLOGER_USER_ID_HERE",
    "appointmentDate": "2026-11-28",
    "timeSlot": "04:00 PM - 04:30 PM",
    "consultationMode": "chat",
    "notes": "Career guidance and gemstone consultation"
}'
```

---

### 5.2 Get Appointments for Astrologer (Astrologer Dashboard)
```bash
curl --location 'https://astrobackend.bhoomitechzone.shop/api/appointments/astrologer/ASTROLOGER_USER_ID'
```

---

### 5.3 Get Appointments for User (User Profile Page)
```bash
curl --location 'https://astrobackend.bhoomitechzone.shop/api/appointments/user/USER_ID'
```

---

### 5.4 Update Appointment Status (Astrologer Confirms or Completes)
Statuses: `CONFIRMED`, `COMPLETED`, `CANCELLED`

```bash
curl --location --request PATCH 'https://astrobackend.bhoomitechzone.shop/api/appointments/APPOINTMENT_ID/status' \
--header 'Content-Type: application/json' \
--data '{
    "status": "CONFIRMED"
}'
```

---

## 6. Consultation History & Chat Details

### 6.1 Get Consultation History (By User or Astrologer ID)
```bash
curl --location 'https://astrobackend.bhoomitechzone.shop/api/consultations/history/USER_OR_ASTROLOGER_ID'
```

---

### 6.2 Get Single Consultation Chat & Call Details
```bash
curl --location 'https://astrobackend.bhoomitechzone.shop/api/consultations/CONSULTATION_ID'
```

---

## 7. Astrologer Payment QR & Receipt Verification

### 7.1 Astrologer Uploads Their UPI QR Code
```bash
curl --location 'https://astrobackend.bhoomitechzone.shop/api/payment-qr' \
--form 'qrImage=@"/path/to/pandit-upi-qr.jpg"' \
--form 'title="Acharya Dev Sharma Consultation QR"' \
--form 'upiId="acharyadev@oksbi"' \
--form 'accountHolderName="Dev Sharma"' \
--form 'bankName="State Bank of India"' \
--form 'role="astrologer"' \
--form 'astrologerId="ASTROLOGER_PROFILE_OR_USER_ID"' \
--form 'isDefault="true"'
```

---

### 7.2 Get Active QR (User scans to pay)
```bash
curl --location 'https://astrobackend.bhoomitechzone.shop/api/payment-qr/active?astrologerId=ASTROLOGER_ID'
```

---

### 7.3 User Submits Payment Screenshot
```bash
curl --location 'https://astrobackend.bhoomitechzone.shop/api/manual-payments/submit' \
--header 'Authorization: Bearer USER_LOGIN_TOKEN' \
--form 'screenshot=@"/path/to/payment-screenshot.jpg"' \
--form 'amount="500"' \
--form 'utrNumber="432109876543"' \
--form 'paymentMethod="PhonePe"' \
--form 'astrologerId="ASTROLOGER_ID"' \
--form 'purpose="consultation"'
```

---

### 7.4 Astrologer / Admin Views Received Payment Submissions
```bash
curl --location 'https://astrobackend.bhoomitechzone.shop/api/manual-payments?status=pending'
```

---

### 7.5 Astrologer / Admin Approves or Rejects Payment
```bash
curl --location --request PATCH 'https://astrobackend.bhoomitechzone.shop/api/manual-payments/PAYMENT_ID/status' \
--header 'Content-Type: application/json' \
--data '{
    "status": "approved",
    "adminRemarks": "UTR verified with bank statement. Payment confirmed."
}'
```

---

## 8. Admin Approval & KYC Verification

### 8.1 Get All Pending Astrologers
```bash
curl --location 'https://astrobackend.bhoomitechzone.shop/api/admin/astrologers/pending'
```

---

### 8.2 Approve Astrologer Account (Activates Profile)
```bash
curl --location --request PATCH 'https://astrobackend.bhoomitechzone.shop/api/admin/astrologers/ASTROLOGER_USER_ID/status' \
--header 'Content-Type: application/json' \
--data '{
    "status": "active"
}'
```

---

### 8.3 Verify / Approve Astrologer KYC Documents
```bash
curl --location --request PATCH 'https://astrobackend.bhoomitechzone.shop/api/astrologer/kyc-status/ASTROLOGER_USER_ID' \
--header 'Content-Type: application/json' \
--data '{
    "status": "verified",
    "rejectionReason": null
}'
```
