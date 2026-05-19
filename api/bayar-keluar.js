import axios from 'axios';
import * as StellarSdk from 'stellar-sdk';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { action, paymentId, txid, uid, amount, metadata, accessToken } = req.body;
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;
    const PI_API_BASE = 'https://api.minepi.com/v2/payments';

    if (!API_KEY || !WALLET_SEED) {
        return res.status(500).json({ error: "Konfigurasi server tidak lengkap" });
    }

    // ============================================
    // VALIDASI ACCESS TOKEN (WAJIB)
    // ============================================
    async function validateToken(token) {
        if (!token) throw new Error("Access token missing");
        const meRes = await axios.get('https://api.minepi.com/v2/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!meRes.data?.uid) throw new Error("Invalid access token");
        return meRes.data.uid;
    }

    // ============================================
    // APPROVE (untuk A2U)
    // ============================================
    if (action === 'approve' && paymentId) {
        try {
            await validateToken(accessToken);
            await axios.post(`${PI_API_BASE}/${paymentId}/approve`, {}, {
                headers: { 'Authorization': `Key ${API_KEY}` }
            });
            return res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    // ============================================
    // COMPLETE (untuk A2U)
    // ============================================
    if (action === 'complete' && paymentId && txid) {
        try {
            await validateToken(accessToken);
            await axios.post(`${PI_API_BASE}/${paymentId}/complete`, { txid }, {
                headers: { 'Authorization': `Key ${API_KEY}`, 'Content-Type': 'application/json' }
            });
            return res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    // ============================================
    // CREATE + SIGN + SUBMIT + COMPLETE (A2U)
    // ============================================
    if (!uid || !amount) {
        return res.status(400).json({ error: "Data tak lengkap" });
    }

    try {
        await validateToken(accessToken);

        // CREATE
        const createRes = await axios.post(PI_API_BASE, {
            amount, memo: 'MB-LEGACY-A2U', metadata: metadata || {}, uid
        }, { headers: { 'Authorization': `Key ${API_KEY}`, 'Content-Type': 'application/json' } });

        const paymentId = createRes.data.identifier;
        const txXdr = createRes.data.transaction?.to_sign;
        if (!txXdr) throw new Error('Transaction XDR missing');

        // SIGN
        const keypair = StellarSdk.Keypair.fromSecret(WALLET_SEED);
        const tx = new StellarSdk.Transaction(txXdr, StellarSdk.Networks.TESTNET);
        tx.sign(keypair);
        const signedTxXdr = tx.toEnvelope().toXDR('base64');

        // SUBMIT
        const submitRes = await axios.post(`${PI_API_BASE}/${paymentId}/submit`, { txid: signedTxXdr }, {
            headers: { 'Authorization': `Key ${API_KEY}`, 'Content-Type': 'application/json' }
        });

        const txid = submitRes.data.txid;

        // COMPLETE
        await axios.post(`${PI_API_BASE}/${paymentId}/complete`, { txid }, {
            headers: { 'Authorization': `Key ${API_KEY}`, 'Content-Type': 'application/json' }
        });

        return res.status(200).json({ success: true, paymentId, txid });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
            }
