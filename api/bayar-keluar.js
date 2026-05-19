import axios from 'axios';
import { Keypair, Transaction, Networks } from '@stellar/stellar-sdk';

export default async function handler(req, res) {
    console.log("🚀 A2U Payment - Axios (Patuh SOP)");

    // 1. METHOD CHECK (SOP)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Kaedah Tidak Dibenarkan' });
    }

    // 2. INPUT & KONFIGURASI
    const { uid, amount, accessToken, metadata } = req.body;
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;
    const BASE = 'https://api.minepi.com/v2'; // URL stabil U2A

    // 3. SEMAK KONFIGURASI (SOP)
    if (!API_KEY || !WALLET_SEED) {
        console.error("❌ Konfigurasi tidak lengkap");
        return res.status(500).json({ error: "Konfigurasi server tidak lengkap" });
    }

    // 4. SEMAK PARAMETER (SOP)
    if (!uid || !amount || !accessToken) {
        return res.status(400).json({ error: "Parameter diperlukan" });
    }

    // 5. SAHKAN ACCESS TOKEN (SOP - WAJIB)
    try {
        console.log("👤 Mengesahkan token...");
        const meRes = await axios.get(`${BASE}/me`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!meRes.data?.uid || meRes.data.uid !== uid) {
            return res.status(401).json({ error: "Access token tidak sah" });
        }
        console.log("✅ Token sah:", meRes.data.username);
    } catch (error) {
        console.error("❌ Ralat ME:", error.response?.data);
        return res.status(401).json({ error: "Gagal mengesahkan access token" });
    }

    // 6. PROSES A2U: CIPTA, SIGN, SUBMIT, COMPLETE (SOP)
    try {
        // 6a. CIPTA PEMBAYARAN
        const idempotencyKey = `a2u-${uid}-${amount}-${Date.now()}`;
        console.log("📤 Mencipta pembayaran...");
        
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
        console.log("✅ Pembayaran dicipta:", paymentId);

        if (!txXdr) {
            throw new Error('Transaction XDR missing dari Pi API');
        }

        // 6b. TANDATANGAN
        console.log("🔏 Menandatangani transaksi...");
        const keypair = Keypair.fromSecret(WALLET_SEED);
        const tx = new Transaction(txXdr, Networks.PUBLIC); // Guna PUBLIC untuk mainnet Pi
        tx.sign(keypair);
        const signedTxXdr = tx.toEnvelope().toXDR('base64');
        console.log("✅ Transaksi ditandatangani");

        // 6c. SUBMIT
        console.log("📤 Menghantar transaksi...");
        const submitRes = await axios.post(
            `${BASE}/payments/${paymentId}/submit`,
            { txid: signedTxXdr },
            { headers: { 'Authorization': `Key ${API_KEY}`, 'Content-Type': 'application/json' } }
        );
        const txid = submitRes.data.txid;
        console.log("✅ Transaksi dihantar:", txid);

        // 6d. COMPLETE
        console.log("📤 Melengkapkan pembayaran...");
        await axios.post(
            `${BASE}/payments/${paymentId}/complete`,
            { txid },
            { headers: { 'Authorization': `Key ${API_KEY}`, 'Content-Type': 'application/json' } }
        );
        console.log("✅ Pembayaran lengkap!");

        // 7. BERJAYA
        return res.status(200).json({
            success: true,
            paymentId,
            txid
        });

    } catch (error) {
        console.error("❌ Ralat A2U:", error.response?.data || error.message);
        const status = error.response?.status || 500;
        const msg = error.response?.data?.error || error.message;
        return res.status(status).json({ error: msg });
    }
}
