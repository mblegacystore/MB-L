// api/bayar-keluar.js
import axios from 'axios';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { uid, amount, accessToken, metadata } = req.body;
    
    // ✅ GUNA TESTNET KEY
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const BASE = 'https://api.minepi.com/v2';

    if (!API_KEY) {
        return res.status(500).json({ error: 'Testnet API key missing' });
    }

    // STEP 1: Verify user access token
    try {
        const meRes = await axios.get(`${BASE}/me`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (meRes.data?.uid !== uid) {
            return res.status(401).json({ error: 'Invalid user' });
        }
        
        console.log("✅ User verified:", meRes.data.username);
    } catch (error) {
        console.error("Verification failed:", error.response?.data);
        return res.status(401).json({ error: 'Token verification failed' });
    }

    try {
        // STEP 2: Create A2U payment
        const createRes = await axios.post(`${BASE}/payments`, {
            amount: parseFloat(amount),
            memo: 'A2U Reward (Testnet)',
            metadata: metadata || {},
            uid: uid
        }, {
            headers: {
                'Authorization': `Key ${API_KEY}`,
                'Idempotency-Key': `testnet-${uid}-${Date.now()}`
            }
        });

        const paymentId = createRes.data.identifier;
        console.log("✅ Payment created:", paymentId);

        // STEP 3: Submit to blockchain
        const submitRes = await axios.post(`${BASE}/payments/${paymentId}/submit`, {}, {
            headers: { 'Authorization': `Key ${API_KEY}` }
        });

        const txid = submitRes.data.transaction?.txid;
        console.log("✅ Submitted, txid:", txid);

        // STEP 4: Complete payment
        await axios.post(`${BASE}/payments/${paymentId}/complete`, { txid }, {
            headers: { 'Authorization': `Key ${API_KEY}` }
        });

        console.log("🎉 A2U completed!");

        return res.status(200).json({
            success: true,
            paymentId,
            txid,
            amount: parseFloat(amount)
        });

    } catch (error) {
        console.error("A2U Error:", error.response?.data || error.message);
        
        // Handle "already linked" error - try complete
        if (error.response?.data?.error === 'payment_already_linked_with_a_tx') {
            try {
                const paymentId = error.response?.data?.payment_id;
                const getRes = await axios.get(`${BASE}/payments/${paymentId}`, {
                    headers: { 'Authorization': `Key ${API_KEY}` }
                });
                const txid = getRes.data.transaction?.txid;
                if (txid) {
                    await axios.post(`${BASE}/payments/${paymentId}/complete`, { txid }, {
                        headers: { 'Authorization': `Key ${API_KEY}` }
                    });
                    return res.status(200).json({ success: true, paymentId, txid, recovered: true });
                }
            } catch (e) {}
        }
        
        return res.status(error.response?.status || 500).json({
            error: error.response?.data?.error || error.message
        });
    }
            }
