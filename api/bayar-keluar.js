import axios from 'axios';
import { Keypair, Transaction, Networks } from '@stellar/stellar-sdk';

export default async function handler(req, res) {
    // ========== 1. SEMAK METHOD ==========
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Kaedah Tidak Dibenarkan' });
    }

    // ========== 2. DAPATKAN INPUT ==========
    const { uid, amount, accessToken, metadata } = req.body;

    // ========== 3. KONFIGURASI ==========
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;
    const PI_API = 'https://api.testnet.minepi.com/v2';
    const PI_ME = 'https://api.minepi.com/v2'; // ME hanya di mainnet

    // ========== 4. SEMAK KONFIGURASI SERVER ==========
    if (!API_KEY || !WALLET_SEED) {
        console.error("Konfigurasi tidak lengkap");
        return res.status(500).json({ error: "Konfigurasi server tidak lengkap" });
    }

    // ========== 5. SEMAK PARAMETER WAJIB ==========
    if (!uid || !amount || !accessToken) {
        return res.status(400).json({ error: "Parameter uid, amount, accessToken diperlukan" });
    }

    // ========== 6. SAHKAN AMOUNT ==========
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ error: "Amount tidak sah" });
    }

    // ========== 7. SAHKAN ACCESS TOKEN (SOP: WAJIB) ==========
    try {
        const meRes = await axios.get(`${PI_ME}/me`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!meRes.data?.uid) {
            return res.status(401).json({ error: "Access token tidak sah" });
        }

        // SOP: UID dari token MESTI sama dengan UID request
        if (meRes.data.uid !== uid) {
            return res.status(401).json({ error: "UID tidak sepadan dengan token" });
        }

        console.log("✅ Token disahkan untuk:", meRes.data.username);
    } catch (error) {
        const status = error.response?.status || 500;
        const msg = error.response?.data?.error || "Gagal mengesahkan access token";
        return res.status(status).json({ error: msg });
    }

    try {
        // ========== 8. CIPTA PEMBAYARAN ==========
        // SOP: Guna POST /payments (BUKAN /payments/create)
        // SOP: WAJIB sertakan Idempotency-Key
        const idempotencyKey = `a2u-${uid}-${numericAmount}-${Date.now()}`;
        
        const createRes = await axios.post(`${PI_API}/payments`, {
            amount: numericAmount,
            memo: 'MB-LEGACY-A2U', // SOP: Memo pilihan tapi disyorkan
            metadata: metadata || {}, // SOP: Metadata mesti objek JSON
            uid: uid
        }, {
            headers: {
                'Authorization': `Key ${API_KEY}`,
                'Content-Type': 'application/json',
                'Idempotency-Key': idempotencyKey // SOP: WAJIB
            }
        });

        const paymentId = createRes.data.identifier;
        const txXdr = createRes.data.transaction?.to_sign;

        if (!txXdr) {
            console.error("XDR missing:", createRes.data);
            throw new Error('Transaction XDR missing dari Pi API');
        }

        console.log("✅ Pembayaran dicipta:", paymentId);

        // ========== 9. TANDATANGANI TRANSAKSI ==========
        // SOP: Guna Stellar SDK, tandatangan dengan wallet seed server
        let signedTxXdr;
        try {
            const keypair = Keypair.fromSecret(WALLET_SEED);
            const tx = new Transaction(txXdr, Networks.TESTNET);
            tx.sign(keypair);
            signedTxXdr = tx.toEnvelope().toXDR('base64');
            console.log("✅ Transaksi ditandatangani");
        } catch (stellarError) {
            console.error("Ralat Stellar:", stellarError);
            return res.status(500).json({ 
                error: "Gagal menandatangani transaksi",
                details: stellarError.message 
            });
        }

        // ========== 10. HANTAR TRANSAKSI ==========
        // SOP: POST /payments/:paymentId/submit
        const submitRes = await axios.post(
            `${PI_API}/payments/${paymentId}/submit`,
            { txid: signedTxXdr },
            {
                headers: {
                    'Authorization': `Key ${API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const txid = submitRes.data.txid;
        console.log("✅ Transaksi dihantar:", txid);

        // ========== 11. LENGKAPKAN PEMBAYARAN ==========
        // SOP: POST /payments/:paymentId/complete
        const completeRes = await axios.post(
            `${PI_API}/payments/${paymentId}/complete`,
            { txid },
            {
                headers: {
                    'Authorization': `Key ${API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log("✅ Pembayaran lengkap:", completeRes.data);

        // ========== 12. RESPONS BERJAYA ==========
        return res.status(200).json({
            success: true,
            paymentId,
            txid,
            status: completeRes.data.status || 'completed'
        });

    } catch (error) {
        console.error("❌ Ralat A2U:", {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });

        const status = error.response?.status || 500;
        const msg = error.response?.data?.error || error.message || "Ralat tidak diketahui";

        return res.status(status).json({ error: msg });
    }
            }
