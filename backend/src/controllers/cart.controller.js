const Cart = require("../models/cart.model");
const Product = require("../models/product.model");

// Helper to get or create cart
const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = new Cart({ user: userId, items: [] });
  }
  return cart;
};

// 1. Get User's Cart
const getCart = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : req.params.userId || req.query.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const cart = await Cart.findOne({ user: userId }).populate({
      path: "items.product",
      select: "name slug sellingPrice originalPrice images stock badge category",
    });

    if (!cart) {
      return res.status(200).json({
        success: true,
        data: {
          items: [],
          totalAmount: 0,
          totalItems: 0,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (error) {
    console.error("Get Cart Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch cart",
      error: error.message,
    });
  }
};

// 2. Add to Cart (or increment quantity if already exists)
const addToCart = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : req.body.userId;
    const { productId, quantity = 1 } = req.body;

    if (!userId || !productId) {
      return res.status(400).json({
        success: false,
        message: "User ID and Product ID are required",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (!product.isActive) {
      return res.status(400).json({
        success: false,
        message: "Product is currently unavailable",
      });
    }

    const cart = await getOrCreateCart(userId);

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId.toString()
    );

    const qty = Number(quantity) || 1;

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += qty;
      cart.items[itemIndex].price = product.sellingPrice;
    } else {
      cart.items.push({
        product: product._id,
        quantity: qty,
        price: product.sellingPrice,
      });
    }

    await cart.save();

    const populatedCart = await Cart.findById(cart._id).populate({
      path: "items.product",
      select: "name slug sellingPrice originalPrice images stock badge category",
    });

    return res.status(200).json({
      success: true,
      message: "Product added to cart successfully",
      data: populatedCart,
    });
  } catch (error) {
    console.error("Add To Cart Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add product to cart",
      error: error.message,
    });
  }
};

// 3. Update Cart Item Quantity
const updateCartItem = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : req.body.userId;
    const { productId, quantity } = req.body;

    if (!userId || !productId || quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: "User ID, Product ID, and Quantity are required",
      });
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const newQty = Number(quantity);

    if (newQty <= 0) {
      // If quantity is 0 or less, remove item from cart
      cart.items = cart.items.filter(
        (item) => item.product.toString() !== productId.toString()
      );
    } else {
      const item = cart.items.find(
        (item) => item.product.toString() === productId.toString()
      );

      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Product not found in cart",
        });
      }

      item.quantity = newQty;
    }

    await cart.save();

    const populatedCart = await Cart.findById(cart._id).populate({
      path: "items.product",
      select: "name slug sellingPrice originalPrice images stock badge category",
    });

    return res.status(200).json({
      success: true,
      message: "Cart updated successfully",
      data: populatedCart,
    });
  } catch (error) {
    console.error("Update Cart Item Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update cart",
      error: error.message,
    });
  }
};

// 4. Remove Item from Cart
const removeFromCart = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : req.body.userId || req.query.userId;
    const productId = req.params.productId || req.body.productId;

    if (!userId || !productId) {
      return res.status(400).json({
        success: false,
        message: "User ID and Product ID are required",
      });
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId.toString()
    );

    await cart.save();

    const populatedCart = await Cart.findById(cart._id).populate({
      path: "items.product",
      select: "name slug sellingPrice originalPrice images stock badge category",
    });

    return res.status(200).json({
      success: true,
      message: "Product removed from cart",
      data: populatedCart,
    });
  } catch (error) {
    console.error("Remove From Cart Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove item from cart",
      error: error.message,
    });
  }
};

// 5. Clear Entire Cart
const clearCart = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : req.body.userId || req.query.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const cart = await Cart.findOne({ user: userId });
    if (cart) {
      cart.items = [];
      await cart.save();
    }

    return res.status(200).json({
      success: true,
      message: "Cart cleared successfully",
      data: {
        items: [],
        totalAmount: 0,
        totalItems: 0,
      },
    });
  } catch (error) {
    console.error("Clear Cart Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to clear cart",
      error: error.message,
    });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
};
