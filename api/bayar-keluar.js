import axios from 'axios';
import * as StellarSdk from '@stellar/stellar-sdk';
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    // 1. Tolak method selain POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { uid, amount, accessToken, metadata } = req.body;
    const API_KEY = process.env.PI_API_KEY;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;
    const PI_API = 'https://api.testnet.minepi.com/v2';

    console.log("A2U Start - UID:", uid, "Amount:", amount);

    // 2. Check env var wujud
    if (!API_KEY || !WALLET_SEED) {
        console.error("Missing env vars");
        return res.status(500).json({ error: "Konfigurasi server tidak lengkap" });
    }

    // 3. Validate token dengan Pi API - wajib ikut SOP
    try {
        const me = await axios.get('https://api.minepi.com/v2/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (me.data.uid !== uid) {
            return res.status(401).json({ error: "UID tidak match dengan token" });
        }
        console.log("Token valid");
    } catch (e) {
        console.error("Token validation failed:", e.message);
        return res.status(401).json({ error: "Token invalid" });
    }

    // 4. Buat key unik untuk KV dan Idempotency
    const timestamp = Date.now();
    const kvKey = `a2u:${uid}:${amount}:${timestamp}`;
    const idempotencyKey = `a2u-${uid}-${amount}-${timestamp}`;

    try {
        // 5. Check kalau ada payment pending untuk user ni - elak double
        const existingKeys = await kv.keys(`a2u:${uid}:${amount}:*`);
        for (const key of existingKeys) {
            const existing = await kv.get(key);
            if (existing?.status === 'submitted' && existing?.txid) {
                console.log("Found pending payment, retrying complete:", existing.paymentId);
                await completeWithRetry(existing.paymentId, existing.txid, API_KEY, PI_API);
                await kv.set(key, { ...existing, status: 'completed' });
                return res.status(200).json({ success: true, reused: true, ...existing });
            }
        }

        // 6. Create payment - endpoint BETUL ialah /payments
        console.log("Creating payment...");
        const createRes = await axios.post(`${PI_API}/payments`, {
            amount: parseFloat(amount),
            memo: 'MB-LEGACY-A2U',
            metadata: metadata || {},
            uid: uid
        }, {
            headers: {
                'Authorization': `Key ${API_KEY}`,
                'Idempotency-Key': idempotencyKey,
                'Content-Type': 'application/json'
            }
        });

        const paymentId = createRes.data.identifier;
        const txXdr = createRes.data.transaction?.to_sign;
        if (!txXdr) throw new Error('Transaction XDR missing from Pi API');

        // 7. Simpan dalam KV dulu sebelum sign
        await kv.set(kvKey, { 
            paymentId, 
            amount, 
            status: 'pending', 
            createdAt: timestamp 
        }, { ex: 86400 }); // expire 24 jam
        console.log("Payment created:", paymentId);

        // 8. Sign transaction dengan wallet kau
        const keypair = StellarSdk.Keypair.fromSecret(WALLET_SEED);
        const tx = new StellarSdk.Transaction(txXdr, StellarSdk.Networks.TESTNET);
        tx.sign(keypair);
        const signedTxXdr = tx.toEnvelope().toXDR('base64');

        // 9. Submit transaction ke Pi
        const submitRes = await axios.post(`${PI_API}/payments/${paymentId}/submit`, 
            { txid: signedTxXdr }, 
            { headers: { 'Authorization': `Key ${API_KEY}` } }
        );
        const txid = submitRes.data.txid;

        await kv.set(kvKey, { 
            paymentId, 
            txid, 
            amount, 
            status: 'submitted',
            submittedAt: Date.now()
        });
        console.log("Transaction submitted:", txid);

        // 10. Complete dengan retry 3 kali - SOP wajib
        await completeWithRetry(paymentId, txid, API_KEY, PI_API);

        // 11. Mark completed dalam KV
        await kv.set(kvKey, { 
            paymentId, 
            txid, 
            amount, 
            status: 'completed',
            completedAt: Date.now()
        });
        console.log("Payment completed:", paymentId);

        return res.status(200).json({ 
            success: true, 
            paymentId, 
            txid,
            message: "Pi berjaya dihantar"
        });

    } catch (error) {
        console.error("A2U Error:", error.response?.data || error.message);
        return res.status(500).json({ 
            error:
