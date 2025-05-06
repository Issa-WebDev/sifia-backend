import mongoose from "mongoose";

const registrationSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  company: {
    type: String,
    trim: true,
  },
  country: {
    type: String,
    required: true,
    trim: true,
  },
  participantTypeId: {
    type: String,
    required: true,
    trim: true,
  },
  participantType: {
    type: String,
    required: true,
    trim: true,
  },
  packageId: {
    type: String,
    required: true,
    trim: true,
  },
  packageName: {
    type: String,
    required: true,
    trim: true,
  },
  sector: {
    type: String,
    trim: true,
  },
  additionalInfo: {
    type: String,
    trim: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    required: true,
    default: "FCFA",
  },
  confirmationCode: {
    type: String,
    required: true,
    unique: true,
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending",
  },
  paymentMethod: {
    type: String,
    trim: true,
  },
  transactionId: {
    type: String,
    trim: true,
  },
  paymentDate: {
    type: Date,
  },
  emailSent: {
    type: Boolean,
    default: false,
  },
  language: {
    type: String,
    enum: ["en", "fr"],
    default: "fr",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field on save
registrationSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Registration = mongoose.model("Registration", registrationSchema);

export default Registration;
