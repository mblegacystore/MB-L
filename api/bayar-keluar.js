import axios from 'axios';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { uid, amount, accessToken, metadata } = req.body;
    const API_KEY = process.env.PI_API_KEY;
    const BASE = 'https://api.minepi.com/v2';

    if (!API_KEY) return res.status(500).json({ error: 'Server config error' });
    if (!uid || !amount || !accessToken) {
        return res.status(400).json({ error: 'uid, amount, accessToken required' });
    }

    // STEP 1: Verify user (SOP: WAJIB)
    try {
        const me = await axios.get(`${BASE}/me`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (me.data?.uid !== uid) {
            return res.status(401).json({ error: 'Invalid token' });
        }
    } catch (e) {
        return res.status(401).json({ error: 'Token verification failed' });
    }

    // STEP 2: Check existing pending payment (cegah double)
    try {
        const incomplete = await axios.get(`${BASE}/payments/incomplete_server_payments`, {
            headers: { 'Authorization': `Key ${API_KEY}` }
        });
        const existing = incomplete.data.incomplete_server_payments?.find(p => p.user_uid === uid);
        if (existing) {
            // Try to complete existing payment
            if (existing.transaction?.txid) {
                await axios.post(`${BASE}/payments/${existing.identifier}/complete`, 
                    { txid: existing.transaction.txid },
                    { headers: { 'Authorization': `Key ${API_KEY}` } }
                );
                return res.status(200).json({ success: true, paymentId: existing.identifier, recovered: true });
            }
        }
    } catch (e) { /* No incomplete payments */ }

    // STEP 3: Create A2U payment
    const createRes = await axios.post(`${BASE}/payments`, {
        amount: parseFloat(amount),
        memo: 'MB-LEGACY-A2U',
        metadata: metadata || {},
        uid: uid
    }, {
        headers: {
            'Authorization': `Key ${API_KEY}`,
            'Idempotency-Key': `a2u-${uid}-${amount}-${Date.now()}`
        }
    });

    const paymentId = createRes.data.identifier;

    // STEP 4: Submit to blockchain (WAJIB untuk A2U)
    const submitRes = await axios.post(`${BASE}/payments/${paymentId}/submit`, {}, {
        headers: { 'Authorization': `Key ${API_KEY}` }
    });

    const txid = submitRes.data.transaction?.txid;

    // STEP 5: Complete payment
    await axios.post(`${BASE}/payments/${paymentId}/complete`, { txid }, {
        headers: { 'Authorization': `Key ${API_KEY}` }
    });

    return res.status(200).json({
        success: true,
        paymentId,
        txid,
        amount: parseFloat(amount),
        userUid: uid
    });
}
