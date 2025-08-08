// utils/shipping.js
function calculateShippingFee(totalPrice) {
  if (totalPrice >= 100000) {
    return 0; 
  }
  return 25000; // Mặc định phí ship
}

module.exports = calculateShippingFee;