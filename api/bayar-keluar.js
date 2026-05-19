import axios from 'axios';
import { Keypair, Transaction, Networks } from '@stellar/stellar-sdk';

export default async function handler(req, res) {
    console.log("🚀 Fungsi bermula");
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Kaedah Tidak Dibenarkan' });
    }

    const { uid, amount, accessToken, metadata } = req.body;

    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;
    
    // GUNA SANDBOX URL UNTUK TESTNET
    const PI_API = 'https://api.testnet.minepi.com/v2';
    const PI_ME = 'https://api.minepi.com/v2'; // ME mainnet sahaja

    // Untuk testnet, ME validation mungkin tak berfungsi
    // Jadi kita skip dulu untuk test

    if (!API_KEY || !WALLET_SEED) {
        console.error("❌ Konfigurasi hilang");
        return res.status(500).json({ error: "Konfigurasi server tidak lengkap" });
    }

    if (!uid || !amount || !accessToken) {
        return res.status(400).json({ error: "Parameter diperlukan" });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ error: "Amount tidak sah" });
    }

    try {
        // Test dulu: Cuba GET payments untuk sahkan API berfungsi
        console.log("🔍 Test sambungan ke Pi API...");
        try {
            const testRes = await axios.get(`${PI_API}/payments`, {
                headers: { 'Authorization': `Key ${API_KEY}` }
            });
            console.log("✅ Pi API OK:", testRes.status);
        } catch (apiError) {
            console.error("❌ Pi API Error:", {
                status: apiError.response?.status,
                data: apiError.response?.data,
                url: `${PI_API}/payments`
            });
        }

        // CIPTA PEMBAYARAN
        const idempotencyKey = `a2u-${uid}-${numericAmount}-${Date.now()}`;
        console.log("📤 Menghantar POST /payments...");
        
        const createRes = await axios.post(`${PI_API}/payments`, {
            amount: numericAmount,
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

        console.log("✅ Cipta berjaya:", createRes.data);
        
        const paymentId = createRes.data.identifier;
        const txXdr = createRes.data.transaction?.to_sign;

        if (!txXdr) {
            throw new Error('XDR missing');
        }

        // TANDATANGAN
        const keypair = Keypair.fromSecret(WALLET_SEED);
        const tx = new Transaction(txXdr, Networks.TESTNET);
        tx.sign(keypair);
        const signedTxXdr = tx.toEnvelope().toXDR('base64');
        console.log("✅ Ditandatangani");

        // SUBMIT
        const submitRes = await axios.post(
            `${PI_API}/payments/${paymentId}/submit`,
            { txid: signedTxXdr },
            { headers: { 'Authorization': `Key ${API_KEY}`, 'Content-Type': 'application/json' } }
        );
        console.log("✅ Submit:", submitRes.data);

        // COMPLETE
        const completeRes = await axios.post(
            `${PI_API}/payments/${paymentId}/complete`,
            { txid: submitRes.data.txid },
            { headers: { 'Authorization': `Key ${API_KEY}`, 'Content-Type': 'application/json' } }
        );
        console.log("✅ Complete:", completeRes.data);

        return res.status(200).json({
            success: true,
            paymentId,
            txid: submitRes.data.txid
        });

    } catch (error) {
        console.error("❌ Ralat:", {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
        });
        
        return res.status(error.response?.status || 500).json({
            error: error.response?.data?.error || error.message
        });
    }
}
