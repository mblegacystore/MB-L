import axios from 'axios';
import * as StellarSdk from '@stellar/stellar-sdk';
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { uid, amount, accessToken, metadata } = req.body;
    const API_KEY = process.env.PI_API_KEY;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;
    const PI_API_BASE = 'https://api.testnet.minepi.com/v2';

    if (!API_KEY || !WALLET_SEED) {
        return res.status(500).json({ error: "Server config missing" });
    }

    // 1. Validate token
    try {
        const meRes = await axios.get('https://api.minepi.com/v2/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (meRes.data.uid !== uid) {
            return res.status(401).json({ error: "UID mismatch" });
        }
    } catch (e) {
        return res.status(401).json({ error: "Invalid token" });
    }

    const key = `a2u:${uid}:${amount}`;
    const idempotencyKey = `${uid}-${amount}-${Date.now()}`;

    try {
        // 2. Check DB ada payment pending tak
        const existing = await kv.get(key);
        if (existing && existing.status === 'pending') {
            console.log("Found pending:", existing.paymentId);
            if (existing.txid) {
                await completeWithRetry(existing.paymentId, existing.txid, API_KEY, PI_API_BASE);
                await kv.set(key, { ...existing, status: 'completed' });
                return res.status(200).json({ success: true, ...existing });
            }
        }

        // 3. Create payment
        const createRes = await axios.post(`${PI_API_BASE}/payments`, {
            amount: parseFloat(amount),
            memo: 'MB-LEGACY-A2U',
            metadata: metadata || {},
            uid: uid
        }, {
            headers: {
                'Authorization': `Key ${API_KEY}`,
                'Content-Type': 'application/json',
                'Idempotency-Key': idempotencyKey
            }
        });

        const paymentId = createRes.data.identifier;
        const txXdr = createRes.data.transaction?.to_sign;
        if (!txXdr) throw new Error('XDR missing');

        // 4. Save ke KV sebelum sign
        await kv.set(key, { paymentId, amount, status: 'pending', createdAt: Date.now() });

        // 5. Sign
        const keypair = StellarSdk.Keypair.fromSecret(WALLET_SEED);
        const tx = new StellarSdk.Transaction(txXdr, StellarSdk.Networks.TESTNET);
        tx.sign(keypair);
        const signedTxXdr = tx.toEnvelope().toXDR('base64');

        // 6. Submit
        const submitRes = await axios.post(`${PI_API_BASE}/payments/${paymentId}/submit`, 
            { txid: signedTxXdr }, 
            { headers: { 'Authorization': `Key ${API_KEY}` } }
        );

        const txid = submitRes.data.txid;
        await kv.set(key, { paymentId, txid, amount, status: 'pending_submit', createdAt: Date.now() });

        // 7. Complete dengan retry
        await completeWithRetry(paymentId, txid, API_KEY, PI_API_BASE);

        // 8. Update status complete
        await kv.set(key, { paymentId, txid, amount, status: 'completed', completedAt: Date.now() });

        return res.status(200).json({ success: true, paymentId, txid });

    } catch (error) {
        console.error("A2U Error:", error.response?.data || error.message);
        return res.status(500).json({ error: error.response?.data?.error || error.message });
    }
}

async function completeWithRetry(paymentId, txid, API_KEY, PI_API_BASE) {
    let attempts = 0;
    while (attempts < 3) {
        try {
            await axios.post(`${PI_API_BASE}/payments/${paymentId}/complete`, 
                { txid }, 
                { headers: { 'Authorization': `Key ${API_KEY}` } }
            );
            console.log("Complete OK:", paymentId);
            return;
        } catch (e) {
            attempts++;
            if (attempts === 3) throw e;
            await new Promise(r => setTimeout(r, 1000));
        }
    }
}
