import axios from 'axios';
import { Keypair, Transaction, Networks } from '@stellar/stellar-sdk';

export default async function handler(req, res) {
    console.log("🚀 Fungsi bayar-keluar bermula");
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Kaedah Tidak Dibenarkan' });
    }

    const { uid, amount, accessToken, metadata } = req.body;
    console.log("📦 Request diterima:", { uid, amount, hasToken: !!accessToken });
    
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;
    const PI_API = 'https://api.testnet.minepi.com/v2';

    // Semak konfigurasi
    if (!API_KEY || !WALLET_SEED) {
        console.error("❌ Konfigurasi hilang:", { hasApiKey: !!API_KEY, hasSeed: !!WALLET_SEED });
        return res.status(500).json({ error: "Konfigurasi server tidak lengkap" });
    }

    // Semak parameter
    if (!uid || !amount || !accessToken) {
        return res.status(400).json({ error: "Parameter uid, amount, accessToken diperlukan" });
    }

    // Sahkan amount
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ error: "Amount tidak sah" });
    }

    // LANGKAU VALIDASI ACCESS TOKEN untuk testnet
    // Untuk production, gunakan kod di bawah
    /*
    try {
        const meRes = await axios.get('https://api.minepi.com/v2/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!meRes.data?.uid) {
            return res.status(401).json({ error: "Invalid access token" });
        }
    } catch (error) {
        return res.status(401).json({ error: "Token validation failed" });
    }
    */

    try {
        // 1. CIPTA PEMBAYARAN
        const idempotencyKey = `a2u-${uid}-${numericAmount}-${Date.now()}`;
        console.log("🔑 Idempotency Key:", idempotencyKey);
        
        const createRes = await axios.post(`${PI_API}/payments`, {
            amount: numericAmount,
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
        
        if (!txXdr) {
            console.error("❌ XDR hilang:", createRes.data);
            throw new Error('Transaction XDR missing dari Pi API');
        }
        
        console.log("✅ Pembayaran dicipta:", paymentId);

        // 2. TANDATANGANI TRANSAKSI
        let signedTxXdr;
        try {
            const keypair = Keypair.fromSecret(WALLET_SEED);
            const tx = new Transaction(txXdr, Networks.TESTNET);
            tx.sign(keypair);
            signedTxXdr = tx.toEnvelope().toXDR('base64');
            console.log("✅ Transaksi ditandatangani");
        } catch (stellarError) {
            console.error("❌ Ralat Stellar:", stellarError);
            return res.status(500).json({ 
                error: "Gagal menandatangani transaksi",
                details: stellarError.message 
            });
        }

        // 3. HANTAR TRANSAKSI
        const submitRes = await axios.post(`${PI_API}/payments/${paymentId}/submit`, 
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

        // 4. LENGKAPKAN PEMBAYARAN
        const completeRes = await axios.post(`${PI_API}/payments/${paymentId}/complete`, 
            { txid }, 
            {
                headers: {
                    'Authorization': `Key ${API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log("✅ Pembayaran lengkap:", completeRes.data.status);

        return res.status(200).json({ 
            success: true, 
            paymentId, 
            txid,
            status: completeRes.data.status
        });

    } catch (error) {
        console.error("❌ Ralat A2U:", {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        
        const status = error.response?.status || 500;
        const msg = error.response?.data?.error || error.message;
        
        return res.status(status).json({ 
            error: msg,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}
