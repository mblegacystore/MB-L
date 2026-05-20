import axios from 'axios';

export default async function handler(req, res) {
    console.log("=========================================");
    console.log("[DEBUG] bayar-keluar.js called");
    console.log("=========================================");

    if (req.method !== 'POST') {
        console.log("[ERROR] Method not allowed:", req.method);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { uid, amount, accessToken, metadata } = req.body;
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const BASE = 'https://api.minepi.com/v2';

    console.log("[DEBUG] Input received:");
    console.log("  - uid:", uid);
    console.log("  - amount:", amount);
    console.log("  - accessToken length:", accessToken ? accessToken.length : 0);
    console.log("  - accessToken first 20 chars:", accessToken ? accessToken.substring(0, 20) + "..." : "null");
    console.log("  - metadata:", metadata);
    console.log("  - API_KEY exists:", API_KEY ? "YES" : "NO");

    if (!API_KEY) {
        console.log("[ERROR] API_KEY missing");
        return res.status(500).json({ error: 'Server config error: API_KEY missing' });
    }

    if (!uid || !amount || !accessToken) {
        console.log("[ERROR] Missing required fields");
        return res.status(400).json({ error: 'uid, amount, accessToken required' });
    }

    // ========== STEP 1: VERIFY USER ==========
    console.log("\n[STEP 1] Verifying user with GET /me...");
    try {
        const meRes = await axios.get(`${BASE}/me`, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
            timeout: 10000
        });

        console.log("[DEBUG] GET /me response status:", meRes.status);
        console.log("[DEBUG] GET /me response data:", JSON.stringify(meRes.data, null, 2));

        if (!meRes.data || meRes.data.uid !== uid) {
            console.log("[ERROR] UID mismatch!");
            console.log("  - Expected UID:", uid);
            console.log("  - Actual UID from token:", meRes.data?.uid);
            return res.status(401).json({ error: 'User not found - UID mismatch' });
        }

        console.log("[SUCCESS] User verified:", meRes.data.username, "(" + meRes.data.uid + ")");

    } catch (error) {
        console.log("[ERROR] GET /me failed:");
        console.log("  - Status:", error.response?.status);
        console.log("  - Error data:", error.response?.data);
        console.log("  - Message:", error.message);
        
        if (error.response?.status === 401) {
            return res.status(401).json({ 
                error: 'User not found - Invalid or expired token',
                details: error.response?.data
            });
        }
        return res.status(500).json({ error: 'Verification failed: ' + error.message });
    }

    // ========== STEP 2: CREATE PAYMENT ==========
    console.log("\n[STEP 2] Creating A2U payment...");
    let paymentId;
    try {
        const createRes = await axios.post(`${BASE}/payments`, {
            amount: parseFloat(amount),
            memo: 'MB-LEGACY-A2U-REWARD',
            metadata: metadata || {},
            uid: uid
        }, {
            headers: {
                'Authorization': `Key ${API_KEY}`,
                'Content-Type': 'application/json',
                'Idempotency-Key': `claim-${uid}-${Date.now()}`
            },
            timeout: 15000
        });

        paymentId = createRes.data.identifier;
        console.log("[SUCCESS] Payment created:", paymentId);
        console.log("  - Full response:", JSON.stringify(createRes.data, null, 2));

    } catch (error) {
        console.log("[ERROR] Create payment failed:");
        console.log("  - Status:", error.response?.status);
        console.log("  - Error data:", error.response?.data);
        return res.status(500).json({ error: 'Create payment failed: ' + (error.response?.data?.error || error.message) });
    }

    // ========== STEP 3: SUBMIT TO BLOCKCHAIN ==========
    console.log("\n[STEP 3] Submitting to blockchain...");
    let txid;
    try {
        const submitRes = await axios.post(`${BASE}/payments/${paymentId}/submit`, {}, {
            headers: { 'Authorization': `Key ${API_KEY}` },
            timeout: 30000
        });

        txid = submitRes.data.transaction?.txid;
        console.log("[SUCCESS] Submitted to blockchain");
        console.log("  - txid:", txid);
        console.log("  - Full response:", JSON.stringify(submitRes.data, null, 2));

        if (!txid) {
            throw new Error("No txid returned from submit");
        }

    } catch (error) {
        console.log("[ERROR] Submit failed:");
        console.log("  - Status:", error.response?.status);
        console.log("  - Error data:", error.response?.data);
        return res.status(500).json({ error: 'Submit failed: ' + (error.response?.data?.error || error.message) });
    }

    // ========== STEP 4: COMPLETE PAYMENT ==========
    console.log("\n[STEP 4] Completing payment...");
    try {
        await axios.post(`${BASE}/payments/${paymentId}/complete`, { txid }, {
            headers: { 'Authorization': `Key ${API_KEY}` },
            timeout: 15000
        });

        console.log("[SUCCESS] Payment completed!");
        
        return res.status(200).json({
            success: true,
            paymentId: paymentId,
            txid: txid,
            amount: parseFloat(amount),
            userUid: uid
        });

    } catch (error) {
        console.log("[ERROR] Complete failed:");
        console.log("  - Status:", error.response?.status);
        console.log("  - Error data:", error.response?.data);
        return res.status(500).json({ error: 'Complete failed: ' + (error.response?.data?.error || error.message) });
    }
}
