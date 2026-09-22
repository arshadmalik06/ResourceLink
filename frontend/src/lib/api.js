import { supabase } from './supabase.js';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
const AI_URL = import.meta.env.VITE_AI_URL || 'http://localhost:8000';

// ─── Express Backend ──────────────────────────────────────────

/** Fetch all resources with institution + time_slot data via Express */
export async function fetchResources() {
  const res = await fetch(`${BACKEND}/api/resources`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch resources');
  return json.data;
}

/** Request a booking (Phase 1 — no payment yet) */
export async function requestBooking({ slotId, purpose, researcherName, token }) {
  const res = await fetch(`${BACKEND}/api/bookings/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ slotId, purpose, researcherName }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Booking request failed');
  return json;
}

/** Settle a booking with x402 payment (Phase 2) */
export async function settleBooking({ bookingId, slotId, token }) {
  const res = await fetch(`${BACKEND}/api/bookings/settle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ bookingId, slotId }),
  });
  return res;
}

/** Finalize booking directly with txId (Demo fallback) */
export async function finalizeBooking({ bookingId, slotId, txId, token }) {
  const res = await fetch(`${BACKEND}/api/bookings/finalize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ bookingId, slotId, txId }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to finalize booking');
  return json;
}

// ─── FastAPI AI Matching ──────────────────────────────────────

/** Run AI match against the FastAPI matching engine */
export async function runAIMatch({
  category,
  required_capability = [],
  start_time,
  end_time,
  latitude,
  longitude,
  budget,
  operator_required = false,
}) {
  const res = await fetch(`${AI_URL}/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category,
      required_capability,
      start_time,
      end_time,
      latitude,
      longitude,
      budget,
      operator_required,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'AI matching request failed');
  }
  return res.json();
}

// ─── Direct Supabase Queries ──────────────────────────────────

/** Fetch all institutions */
export async function fetchInstitutions() {
  const { data, error } = await supabase.from('institutions').select('*');
  if (error) throw error;
  return data;
}

/** Fetch all time_slots (optionally filtered by resource_id) */
export async function fetchTimeSlots(resourceId) {
  let query = supabase.from('time_slots').select('*');
  if (resourceId) query = query.eq('resource_id', resourceId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/** Fetch all bookings */
export async function fetchBookings() {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, time_slots(*, resources(*, institutions(*)))');
  if (error) throw error;
  return data;
}

/** Fetch resources with full joins (direct from Supabase for pages that need raw data) */
export async function fetchResourcesFull() {
  const { data, error } = await supabase
    .from('resources')
    .select('*, institutions(*), time_slots(*)');
  if (error) throw error;
  return data;
}

/** Fetch a single resource by ID with full data */
export async function fetchResourceById(id) {
  const { data, error } = await supabase
    .from('resources')
    .select('*, institutions(*), time_slots(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

/** Fetch summary stats for the home dashboard */
export async function fetchDashboardStats() {
  const [resources, institutions, slots, bookings] = await Promise.all([
    supabase.from('resources').select('id', { count: 'exact', head: true }),
    supabase.from('institutions').select('id', { count: 'exact', head: true }),
    supabase.from('time_slots').select('id, status'),
    supabase.from('bookings').select('id', { count: 'exact', head: true }),
  ]);

  const slotsData = slots.data || [];
  const bookedSlots = slotsData.filter((s) => s.status === 'booked').length;
  const totalSlots = slotsData.length;

  return {
    resourceCount: resources.count || 0,
    institutionCount: institutions.count || 0,
    totalSlots,
    bookedSlots,
    availableSlots: totalSlots - bookedSlots,
    bookingCount: bookings.count || 0,
  };
}
