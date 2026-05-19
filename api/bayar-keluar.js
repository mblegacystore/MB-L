import axios from 'axios';
import { Keypair, Transaction, Networks } from '@stellar/stellar-sdk';
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { uid, amount, accessToken, metadata } = req.body;
    const API_KEY = process.env.PI_API_KEY;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;
    const PI_API = 'https://api.testnet.minepi.com/v2';

    if (!API_KEY || !WALLET_SEED) {
        return res.status(500).json({ error: "Konfigurasi server tidak lengkap" });
    }

    try {
        const me = await axios.get('https://api.minepi.com/v2/me', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (me.data.uid !== uid) {
            return res.status(401).json({ error: "UID tidak match" });
        }
    } catch (e) {
        return res.status(401).json({ error: "Token invalid" });
    }

    const timestamp = Date.now();
    const kvKey = `a2u:${uid}:${amount}:${timestamp}`;
    const idempotencyKey = `a2u-${uid}-${amount}-${timestamp}`;

    try {
        const existingKeys = await kv.keys(`a2u:${uid}:${amount}:*`);
        for (const key of existingKeys) {
            const existing = await kv.get(key);
            if (existing?.status === 'submitted' && existing?.txid) {
                await completeWithRetry(existing.paymentId, existing.txid, API_KEY, PI_API);
                await kv.set(key, { ...existing, status: 'completed' });
                return res.status(200).json({ success: true, reused: true, ...existing });
            }
        }

        const createRes = await axios.post(`${PI_API}/payments`, {
            amount: parseFloat(amount),
            memo: 'MB-LEGACY-A2U',
            metadata: metadata || {},
            uid: uid
        }, {
            headers: {
                Authorization: `Key ${API_KEY}`,
                'Idempotency-Key': idempotencyKey,
                'Content-Type': 'application/json'
            }
        });

        const paymentId = createRes.data.identifier;
        const txXdr = createRes.data.transaction?.to_sign;
        if (!txXdr) throw new Error('Transaction XDR missing');

        await kv.set(kvKey, { 
            paymentId, 
            amount, 
            status: 'pending', 
            createdAt: timestamp 
        }, { ex: 86400 });

        const keypair = Keypair.fromSecret(WALLET_SEED);
        const tx = new Transaction(txXdr, Networks.TESTNET);
        tx.sign(keypair);
        const signedTxXdr = tx.toEnvelope().toXDR('base64');

        const submitRes = await axios.post(`${PI_API}/payments/${paymentId}/submit`, 
            { txid: signedTxXdr }, 
            { headers: { Authorization: `Key ${API_KEY}` } }
        );
        const txid = submitRes.data.txid;

        await kv.set(kvKey, { 
            paymentId, 
            txid, 
            amount, 
            status: '
