const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
          default: 1,
        },
        price: {
          type: Number,
          required: true,
        },
      },
    ],
    totalAmount: {
      type: Number,
      default: 0,
    },
    totalItems: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Calculate totalItems and totalAmount before saving
cartSchema.pre("save", function () {
  this.totalItems = this.items.reduce((acc, item) => acc + item.quantity, 0);
  this.totalAmount = this.items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );
});

module.exports = mongoose.model("Cart", cartSchema);
