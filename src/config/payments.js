"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UPI_QR_URL = exports.UPI_ID = exports.PLANS = void 0;
exports.PLANS = [
    { id: 'basic', name: 'Basic Plan', amount: 199 },
    { id: 'premium', name: 'Premium Plan', amount: 399 },
];
exports.UPI_ID = 'your-upi-id@bank'; // TODO: set this
exports.UPI_QR_URL = '/assets/upi-qr.png'; // TODO: ensure file exists at public/assets/upi-qr.png
