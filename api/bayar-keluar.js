// Storan sementara (guna pangkalan data sebenar di produksi)
let paymentStore = {};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { uid, amount, memo, accessToken } = req.body;

    if (!uid || !amount) {
        return res.status(400).json({ success: false, error: 'Data tak lengkap' });
    }

    if (!accessToken) {
        return res.status(400).json({ success: false, error: 'Access token missing' });
    }

    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;

    if (!API_KEY) return res.status(500).json({ success: false, error: 'API Key missing' });
    if (!WALLET_SEED) return res.status(500).json({ success: false, error: 'Wallet Seed missing' });

    const BASE_URL = 'https://api.minepi.com/v2';

    try {
        // ========== AUTHENTICATE + BEARER ==========
        const meRes = await fetch(`${BASE_URL}/me`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!meRes.ok) {
            return res.status(401).json({ success: false, error: 'Token tidak sah' });
        }

        const meData = await meRes.json();

        if (meData.uid !== uid) {
            return res.status(401).json({ success: false, error: 'UID tidak sepadan' });
        }

        // ========== CIPTA PEMBAYARAN ==========
        const createRes = await fetch(`${BASE_URL}/payments`, {
            method: 'POST',
            headers: {
                Authorization: `Key ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: parseFloat(amount),
                memo: memo || 'A2U Reward',
                uid: uid,
                metadata: { source: 'claim_reward' }
            })
        });

        const createData = await createRes.json();

        if (!createRes.ok) {
            return res.status(400).json({ success: false, error: createData.message || 'Create failed' });
        }

        const paymentId = createData.identifier;

        // ========== SIMPAN PAYMENT ID (WAJIB) ==========
        paymentStore[paymentId] = {
            uid: uid,
            amount: amount,
            memo: memo,
            status: 'created',
            createdAt: new Date().toISOString()
        };

        // ========== SUBMIT ==========
        const submitRes = await fetch(`${BASE_URL}/payments/${paymentId}/submit`, {
            method: 'POST',
            headers: {
                Authorization: `Key ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ seed: WALLET_SEED })
        });

        const submitData = await submitRes.json();

        if (!submitRes.ok || !submitData.txid) {
            // Gagal submit → kemas kini status
            paymentStore[paymentId].status = 'submit_failed';
            paymentStore[paymentId].error = submitData.message || 'Submit failed';
            
            return res.status(400).json({ success: false, error: 'Submit failed' });
        }

        const txid = submitData.txid;

        // ========== SIMPAN TXID (WAJIB) ==========
        paymentStore[paymentId].txid = txid;
        paymentStore[paymentId].status = 'submitted';

        // ========== COMPLETE ==========
        const completeRes = await fetch(`${BASE_URL}/payments/${paymentId}/complete`, {
            method: 'POST',
            headers: {
                Authorization: `Key ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ txid: txid })
        });

        const completeData = await completeRes.json();

        // ========== SIMPAN STATUS AKHIR (WAJIB) ==========
        paymentStore[paymentId].status = 'completed';
        paymentStore[paymentId].completedAt = new Date().toISOString();
        paymentStore[paymentId].completeData = completeData;

        // ========== BERJAYA ==========
        return res.status(200).json({
            success: true,
            message: '0.1 Pi berjaya dihantar!',
            paymentId: paymentId,
            txid: txid,
            stored: paymentStore[paymentId]
        });

    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
