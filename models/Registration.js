import mongoose from "mongoose";

const installmentSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending",
  },
  transactionId: {
    type: String,
    required: true,
  },
  paymentDate: {
    type: Date,
  },
  paymentMethod: {
    type: String,
    trim: true,
  },
  index: {
    type: Number,
    required: true,
  },
});

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
  postal: {
    type: String,
    required: true,
    trim: true,
  },
  city: {
    type: String,
    required: true,
    trim: true,
  },
  address: {
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
  installments: {
    type: [installmentSchema],
    default: [],
  },
  totalPaid: {
    type: Number,
    default: 0,
  },
  isFullyPaid: {
    type: Boolean,
    default: false,
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

// Calculate total paid amount and update isFullyPaid status
registrationSchema.pre("save", function (next) {
  if (this.installments && this.installments.length > 0) {
    // Calculate total paid
    this.totalPaid = this.installments
      .filter((installment) => installment.status === "completed")
      .reduce((sum, installment) => sum + installment.amount, 0);

    // Check if fully paid
    this.isFullyPaid = this.totalPaid >= this.amount;

    // Update payment status based on installments
    if (this.isFullyPaid) {
      this.paymentStatus = "completed";

      // Set payment date to the latest installment payment date if not already set
      if (!this.paymentDate && this.installments.some((i) => i.paymentDate)) {
        const paidInstallments = this.installments
          .filter((i) => i.paymentDate)
          .sort(
            (a, b) =>
              new Date(b.paymentDate).getTime() -
              new Date(a.paymentDate).getTime()
          );

        if (paidInstallments.length > 0) {
          this.paymentDate = paidInstallments[0].paymentDate;
        }
      }
    }
  }

  next();
});

const Registration = mongoose.model("Registration", registrationSchema);

export default Registration;
