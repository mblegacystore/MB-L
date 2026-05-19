import axios from 'axios';
import { Keypair, Transaction, Networks } from '@stellar/stellar-sdk';

export default async function handler(req, res) {
    // 1. METHOD CHECK (SOP)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Kaedah Tidak Dibenarkan' });
    }

    // 2. INPUT & KONFIGURASI
    const { uid, amount, accessToken, metadata } = req.body;
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;
    const BASE = "https://api.minepi.com/v2";

    // 3. SEMAK KONFIGURASI (SOP)
    if (!API_KEY || !WALLET_SEED) {
        return res.status(500).json({ error: "Konfigurasi server tidak lengkap" });
    }

    // 4. SEMAK PARAMETER (SOP)
    if (!uid || !amount || !accessToken) {
        return res.status(400).json({ error: "Parameter uid, amount, accessToken diperlukan" });
    }

    // 5. SAHKAN ACCESS TOKEN (SOP - WAJIB)
    try {
        const meRes = await axios.get(`${BASE}/me`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!meRes.data?.uid || meRes.data.uid !== uid) {
            return res.status(401).json({ error: "Access token tidak sah" });
        }
    } catch (error) {
        return res.status(401).json({ error: "Gagal mengesahkan access token" });
    }

    // 6. CIPTA, SIGN, SUBMIT, COMPLETE (SOP)
    try {
        // CIPTA PEMBAYARAN
        const idempotencyKey = `a2u-${uid}-${amount}-${Date.now()}`;
        const createRes = await axios.post(`${BASE}/payments`, {
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

        // TANDATANGAN
        const keypair = Keypair.fromSecret(WALLET_SEED);
        const tx = new Transaction(txXdr, Networks.PUBLIC);
        tx.sign(keypair);
        const signedTxXdr = tx.toEnvelope().toXDR('base64');

        // SUBMIT
        const submitRes = await axios.post(
            `${BASE}/payments/${paymentId}/submit`,
            { txid: signedTxXdr },
            { headers: { 'Authorization': `Key ${API_KEY}`, 'Content-Type': 'application/json' } }
        );

        // COMPLETE
        await axios.post(
            `${BASE}/payments/${paymentId}/complete`,
            { txid: submitRes.data.txid },
            { headers: { 'Authorization': `Key ${API_KEY}`, 'Content-Type': 'application/json' } }
        );

        return res.status(200).json({
            success: true,
            paymentId,
            txid: submitRes.data.txid
        });

    } catch (error) {
        const status = error.response?.status || 500;
        const msg = error.response?.data?.error || error.message;
        return res.status(status).json({ error: msg });
    }
}
