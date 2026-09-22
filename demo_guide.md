# ResourceLink — Complete Demo Script

> **All inputs below are tested against your actual Supabase data and will produce results.**

---

## Prerequisites — Make Sure All 3 Servers Are Running

```
Terminal 1:  cd backend       → npm run dev          (port 4000) ✅ already running
Terminal 2:  cd ai-matching   → uvicorn main:app --reload --port 8000  ✅ already running  
Terminal 3:  cd frontend      → npm run dev          (port 5173) ✅ already running
```

Open **http://localhost:5173** in your browser.

---

## DEMO 1 — Home Page (Live Dashboard)

> **What it shows:** Real-time stats pulled from Supabase, not hardcoded.

### Steps
1. Open **http://localhost:5173/**
2. Watch the animated counters load — they show **real** numbers:
   - **20** active listings (your 20 resources in Supabase)
   - **5** verified institutions (IIT Madras, IISc, SRM, AIIMS, CSIR)
   - **4** slots booked (4 time_slots with status "booked")
   - **16** available now (16 time_slots with status "available")
3. Scroll down — **Featured Resources** section shows 3 real resources that have available slots
4. Click "Reserve capacity" → goes to Discover page
5. Click any step in the **pipeline flow** (1→2→3→4→5→6) → navigates to that page

### What to say in demo
> *"These are live counts from our Supabase PostgreSQL database — 20 pieces of equipment across 5 verified institutions. As bookings happen, these numbers update in real time."*

---

## DEMO 2 — Discover Page (Browse + Map + Filters)

### Steps
1. Click **"Discover"** in the navbar (or go to `/discover`)
2. Page loads **20 resources** with a **Leaflet map** showing 5 institution markers across India

### Filter Demo — Try Each One:

| Filter | Input | Expected Result |
|--------|-------|-----------------|
| **Search box** | Type `MRI` | Shows only **Siemens 3T Clinical MRI** (AIIMS) |
| **Search box** | Clear it, type `cryo` | Shows **Titan Krios Cryo-TEM** (IIT Madras) |
| **Category dropdown** | Select `Microscopy` | Shows 4 resources: Titan Krios, Zeiss LSM 980, JEOL FE-SEM, Park Systems AFM |
| **Category dropdown** | Select `Genomics` | Shows 4 resources: NovaSeq, qPCR, PacBio Sequel, Bioanalyzer |
| **Category dropdown** | Select `Cleanroom` | Shows 2 resources: Suss MicroTec Mask Aligner, Oxford Plasma Etcher |
| **Institution dropdown** | Select `IIT Madras Central Facility` | Shows 4 resources: Titan Krios, Agilent GC-MS, NVIDIA DGX, Panalytical XRD |
| **Institution dropdown** | Select `AIIMS Advanced Diagnostics` | Shows 4 resources: NovaSeq, Bioanalyzer, MRI, FACSAria |
| **Status dropdown** | Select `Available` | Shows resources that have available time slots |
| **Status dropdown** | Select `Fully booked` | Shows resources with zero available slots |

3. **Map interaction** — Click a marker (e.g. the Chennai cluster) → popup shows institution name and its resources
4. **Click any resource card** → navigates to the **Booking Flow** for that resource

### What to say in demo
> *"The Discover page pulls all 20 resources from Supabase with their institution geo-coordinates. The map shows all 5 institutions — IIT Madras in Chennai, IISc in Bangalore, SRM near Chennai, AIIMS in Delhi, and CSIR in Pune. All filters operate on real data."*

---

## DEMO 3 — AI Match (The Star Feature ⭐)

> **This is the most impressive feature — it calls the Python FastAPI engine which scores resources using a multi-factor algorithm.**

### Scenario A: "I need a Microscopy resource near Chennai"

| Field | Exact Input |
|-------|-------------|
| **Category** | `Microscopy` |
| **Required capabilities** | `TEM, cryo` |
| **Start date** | `2026-09-13` |
| **Start time** | `02:00` |
| **End date** | `2026-09-13` |
| **End time** | `06:00` |
| **Latitude** | `13.0` |
| **Longitude** | `80.23` |
| **Budget (ALGO)** | `15` |
| **Operator required** | ☑ checked |

Click **"Run AI Match"**

**Expected output: 1 match**
| # | Resource | Institution | Score | Why |
|---|----------|-------------|-------|-----|
| 1 | **Titan Krios Cryo-TEM** | IIT Madras Central Facility — 0.93 km away | ~**88%** | Category matched, Required capabilities matched, Available during requested time, Within budget, Verified institution, Verified resource, Operator available |

> **Why only 1?** The other Microscopy resources (Zeiss LSM, JEOL, Park AFM) don't have the `TEM` or `cryo` capability, AND they don't have available slots in that time window.

Click **"Reserve"** → takes you to the booking flow for this resource.

---

### Scenario B: "I need any Genomics equipment, flexible on location"

| Field | Exact Input |
|-------|-------------|
| **Category** | `Genomics` |
| **Required capabilities** | *(leave empty)* |
| **Start date** | `2026-09-13` |
| **Start time** | `02:00` |
| **End date** | `2026-09-13` |
| **End time** | `04:00` |
| **Latitude** | `13.0` |
| **Longitude** | `80.0` |
| **Budget (ALGO)** | `20` |
| **Operator required** | ☐ unchecked |

Click **"Run AI Match"**

**Expected output: 2 matches**
| # | Resource | Institution | Score | Distance |
|---|----------|-------------|-------|----------|
| 1 | **QuantStudio 7 Flex qPCR** | SRM University Tech Park | ~**85%** | ~20 km |
| 2 | **Illumina NovaSeq 6000** | AIIMS Advanced Diagnostics | ~**72%** | ~1737 km |

> **Why these 2?** They're the only Genomics resources with slots available during Sep 13 02:00–04:00. The qPCR at SRM scores higher because it's much closer to Chennai (20 km vs 1737 km to Delhi).

---

### Scenario C: "I need a Spectroscopy resource, no capability filter"

| Field | Exact Input |
|-------|-------------|
| **Category** | `Spectroscopy` |
| **Required capabilities** | *(leave empty)* |
| **Start date** | `2026-09-14` |
| **Start time** | `02:00` |
| **End date** | `2026-09-14` |
| **End time** | `05:00` |
| **Latitude** | `18.5` |
| **Longitude** | `73.8` |
| **Budget (ALGO)** | `10` |
| **Operator required** | ☐ unchecked |

Click **"Run AI Match"**

**Expected output: 1 match**
| # | Resource | Institution | Score |
|---|----------|-------------|-------|
| 1 | **Bruker 500 MHz NMR** | CSIR National Chem Lab — ~0 km | ~**90%** |

> **Why?** The location (18.5, 73.8) is Pune — exactly where CSIR is. And the NMR has an available slot Sep 14 02:00–07:00 which covers the requested window perfectly.

---

## DEMO 4 — Booking Flow (End-to-End Reservation)

> **Shows the full booking wizard: select slot → enter details → review → confirm**

### Steps

1. From the AI Match results (Scenario A), click **"Reserve"** on the Titan Krios Cryo-TEM
   - OR navigate directly to: **http://localhost:5173/booking/10000000-0000-0000-0000-000000000001**

2. **Step 1 — Select Slot:** You'll see the available time slots for this resource:
   - Slot: **Sep 13, 7:30 AM → Sep 13, 11:30 AM** (4 hours) — this is the available slot
   - Click on it to select it
   - A blue highlight appears with a checkmark ✓
   - Click **"Continue"**

3. **Step 2 — Enter Details:**
   - **Researcher name:** `Dr. Priya Sharma`
   - **Purpose statement:** `Cryo-EM imaging of SARS-CoV-2 spike protein variants for structural analysis of binding domains`
   - Click **"Review booking"**

4. **Step 3 — Confirm:**
   - Review page shows:
     - Resource: Titan Krios Cryo-TEM
     - Institution: IIT Madras Central Facility
     - Time: the selected slot
     - Duration: 4 hours
     - **Estimated cost: 14.00 ALGO** (3.5 ALGO/hr × 4 hrs)
     - Researcher: Dr. Priya Sharma
     - Purpose: the text you entered
   - Notice the orange box: *"The x402 protocol will require payment of 14.00 ALGO on the Algorand Testnet"*
   - Click **"Submit Booking Request"**

5. **Step 4 — Success!**
   - Green checkmark: "Booking Request Submitted!"
   - Shows Booking ID and Status: `pending_approval`
   - Options: "Proceed to Payment" or "Browse more"

### What to say in demo
> *"The user selects a time slot, enters their research purpose, and the system calculates the cost at 3.5 ALGO per hour. The booking is submitted to the Express backend which creates a record in Supabase. In production, clicking 'Proceed to Payment' triggers the x402 protocol which demands an Algorand micropayment before access is granted."*

---

## DEMO 5 — Payment & Trust Page

### Steps
1. Click **"Payment & Trust"** in the navbar

2. **x402 Protocol Flow** — shows the 4-step stepper:
   - Step 1: Request sent ✓
   - Step 2: 402 required ✓
   - Step 3: On-chain payment (current)
   - Step 4: Access unlocked

3. **Dark flow log** shows the exact API flow:
   ```
   → Institution submits booking intent via /api/bookings/request
   → Server returns HTTP 402 — payment required
   → Client sends ALGO micropayment on Algorand Testnet
   → GoPlausible facilitator verifies the transaction
   → Settlement confirmed via /api/bookings/settle ✓
   → Proof-of-Usage logged with Algorand Transaction ID
   ```

4. **Network Transactions table** — shows any bookings that exist in the database with their status (Pending/Confirmed) and Algorand transaction links

5. **Trust cards** — Institutional verification, Escrowed settlement, Full audit trail

### What to say in demo
> *"The x402 protocol intercepts the booking settlement request with an HTTP 402 status. The client must send ALGO payment on the Algorand Testnet, verified by the GoPlausible facilitator, before the server releases the access credentials. This is all on-chain — every transaction has an Algorand Transaction ID that anyone can verify."*

---

## DEMO 6 — Smart Access Page

### Steps
1. Click **"Smart Access"** in the navbar

2. **If no confirmed bookings exist** — shows an empty state: "No active sessions — Book a resource to get access credentials"

3. **If confirmed bookings exist** — shows:
   - Access card with a generated **access key** like `RL-XK47-N9FM`
   - Session window (the time slot)
   - Researcher name
   - Algorand Tx link (if confirmed via x402)
   - "Copy key" button

4. Below that: **Access Event Log** table showing chronological booking events

### What to say in demo
> *"Once the Algorand payment clears, the system automatically issues access credentials — no manual approval needed. The institution gets a unique access key and session window. Everything is logged as a Proof-of-Usage record."*

---

## DEMO 7 — Predictive Tracking Page

### Steps
1. Click **"Tracking"** in the navbar

2. **Stats grid** shows computed data from real time_slots:
   - **Current utilization: 20%** (4 booked out of 20 slots)
   - **Available slots: 16**
   - **At-risk of overbooking: 1** (resources above 75% utilization)
   - **Hours reclaimed** (sum of booked slot durations)

3. **Bar chart** — shows booking utilization percentage by day:
   - Sep 13: some bars showing booked %
   - Sep 14: some bars
   - Sep 15, Sep 16: lower bars
   - Bars turn red when ≥75% utilization

4. **Resource Watchlist table** — all 20 resources sorted by current utilization:
   - Each row shows resource name, institution, current utilization % with inline bar, forecast %, and trend arrow

### What to say in demo
> *"The tracking dashboard computes utilization in real time from the time_slots table. We can see that 20% of all slots are currently booked, with 16 still available. The bar chart breaks down utilization by day, and the watchlist highlights resources trending toward full capacity — helping institutions proactively list new time windows."*

---

## Quick Reference — All Demo Inputs at a Glance

### AI Match Inputs (copy-paste ready)

**Scenario A (Best demo — shows single precise match):**
```
Category:       Microscopy
Capabilities:   TEM, cryo
Start date:     2026-09-13
Start time:     02:00
End date:       2026-09-13
End time:       06:00
Latitude:       13.0
Longitude:      80.23
Budget:         15
Operator:       ☑ checked
→ Result: 1 match — Titan Krios Cryo-TEM at IIT Madras, 88% score
```

**Scenario B (Shows ranking — multiple results):**
```
Category:       Genomics
Capabilities:   (leave empty)
Start date:     2026-09-13
Start time:     02:00
End date:       2026-09-13
End time:       04:00
Latitude:       13.0
Longitude:      80.0
Budget:         20
Operator:       ☐ unchecked
→ Result: 2 matches — qPCR at SRM (#1, closer), NovaSeq at AIIMS (#2, farther)
```

**Scenario C (Location impact demo):**
```
Category:       Spectroscopy
Capabilities:   (leave empty)
Start date:     2026-09-14
Start time:     02:00
End date:       2026-09-14
End time:       05:00
Latitude:       18.5
Longitude:      73.8
Budget:         10
Operator:       ☐ unchecked
→ Result: 1 match — Bruker NMR at CSIR Pune, ~90% score (requester is in Pune)
```

### Booking Flow Input:
```
Navigate to:    /booking/10000000-0000-0000-0000-000000000001
Select slot:    Sep 13, 7:30 AM → 11:30 AM
Researcher:     Dr. Priya Sharma
Purpose:        Cryo-EM imaging of SARS-CoV-2 spike protein variants
→ Result: Booking created, 14.00 ALGO estimated cost (3.5 × 4 hrs)
```

### Discover Filter Inputs:
```
Search "MRI"         → 1 result (Siemens MRI at AIIMS)
Search "cryo"        → 1 result (Titan Krios at IIT Madras)
Category "Microscopy" → 4 results
Category "Genomics"  → 4 results
Institution "AIIMS"  → 4 results
```

---

## Recommended Demo Order (5 minutes)

| Step | Page | Duration | What to show |
|------|------|----------|--------------|
| 1 | **Home** | 30s | Live stats from Supabase, pipeline flow |
| 2 | **Discover** | 60s | Map, search "MRI", filter by Microscopy, filter by AIIMS |
| 3 | **AI Match** | 90s | Run Scenario A (Microscopy+cryo), show the match result with score & reasons |
| 4 | **Booking** | 60s | Click Reserve → select slot → fill form → confirm booking |
| 5 | **Payment** | 30s | Show x402 flow, explain Algorand settlement |
| 6 | **Tracking** | 30s | Show live utilization stats and bar chart |
