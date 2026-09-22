import express from 'express';
import { requestBooking, finalizeBooking, getProviderBookings, updateBookingStatus } from '../controllers/booking.js';
import { requireAuth } from '../config/auth.js';
import { requireDynamicPayment } from '../config/x402.js';

const router = express.Router();

// GET /api/bookings — Fetch bookings for a provider
router.get('/', requireAuth, getProviderBookings);

// PUT /api/bookings/:id/status — Update booking status
router.put('/:id/status', requireAuth, updateBookingStatus);

// POST /api/bookings/request — Phase 1: Submit purpose & researcher credentials
router.post('/request', requestBooking);

// POST /api/bookings/settle — Phase 2: x402 Algorand micropayment settlement (Strict x402 client required)
router.post('/settle', requireDynamicPayment, finalizeBooking);

// POST /api/bookings/finalize — Phase 2: Direct txId submission (Used for demo frontend)
router.post('/finalize', finalizeBooking);

export default router;