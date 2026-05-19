import axios from 'axios';
import { Keypair, Transaction, Networks } from '@stellar/stellar-sdk';

export default async function handler(req, res) {
    console.log("🚀 Fungsi bermula - Testnet Mode");
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Kaedah Tidak Dibenarkan' });
    }

    const { uid, amount, accessToken, metadata } = req.body;

    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;

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

    // ==================================================
    // SAHKAN TOKEN - Guna mainnet API (sentiasa tersedia)
    // ==================================================
    try {
        const meRes = await axios.get('https://api.minepi.com/v2/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!meRes.data?.uid) {
            return res.status(401).json({ error: "Token tidak sah" });
        }

        if (meRes.data.uid !== uid) {
            return res.status(401).json({ error: "UID tidak sepadan" });
        }

        console.log("✅ Token sah:", meRes.data.username);
    } catch (error) {
        console.error("❌ Ralat ME:", error.response?.data);
        return res.status(401).json({ error: "Gagal sahkan token" });
    }

    // ==================================================
    // TEST: Cari endpoint testnet yang betul
    // ==================================================
    
    console.log("🔍 Mencari endpoint testnet yang aktif...");
    
    // 3 URL mungkin untuk testnet
    const testUrls = [
        'https://api.testnet.minepi.com/v2',    // Option 1
        'https://api.testnet.minepi.com',       // Option 2 (tanpa /v2)
        'https://api.minepi.com/v2',            // Option 3 (mainnet, tapi mungkin berfungsi untuk testnet app)
    ];

    let workingApi = null;
    let testResults = [];

    for (const baseUrl of testUrls) {
        const testUrl = `${baseUrl}/payments`;
        console.log(`   Cuba: ${testUrl}`);
        
        try {
            const response = await axios.get(testUrl, {
                headers: { 'Authorization': `Key ${API_KEY}` },
                validateStatus: (status) => true
            });
            
            console.log(`   → Status: ${response.status}`);
            testResults.push({ url: baseUrl, status: response.status });
            
            if (response.status === 200) {
                workingApi = baseUrl;
                console.log(`✅ ENDPOINT AKTIF: ${baseUrl}`);
                break;
            } else if (response.status === 401 || response.status === 403) {
                // Auth error = URL betul tapi key salah
                console.log(`   → URL MUNGKIN BETUL tapi key/auth issue`);
                testResults[testResults.length - 1].note = 'Auth error - URL mungkin OK';
            }
        } catch (err) {
            console.log(`   → Error: ${err.code} - ${err.message}`);
            testResults.push({ url: baseUrl, error: err.message });
        }
    }

    // Kalau tak jumpa, cuba guna mainnet V2 sebagai fallback
    if (!workingApi) {
        console.log("⚠️  Tiada testnet ditemui, cuba mainnet V2...");
        workingApi = 'https://api.minepi.com/v2';
    }

    console.log("📋 Keputusan test:", JSON.stringify(testResults, null, 2));
    console.log("🎯 Guna API:", workingApi);

    // ==================================================
    // PROSES PEMBAYARAN
    // ==================================================
    try {
        const idempotencyKey = `a2u-${uid}-${numericAmount}-${Date.now()}`;
        
        console.log("📤 Mencipta pembayaran...");
        console.log("   URL:", `${workingApi}/payments`);
        console.log("   Amount:", numericAmount);
        console.log("   UID:", uid);
        console.log("   Key:", idempotencyKey);

        const createRes = await axios.post(`${workingApi}/payments`, {
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

        console.log("✅ Pembayaran dicipta!");
        console.log("   Response:", JSON.stringify(createRes.data, null, 2));

        const paymentId = createRes.data.identifier;
        const txXdr = createRes.data.transaction?.to_sign;

        if (!txXdr) {
            throw new Error('Transaction XDR missing dari response Pi API');
        }

        // TANDATANGAN
        console.log("🔏 Menandatangani transaksi...");
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

        // SUBMIT
        console.log("📤 Menghantar transaksi...");
        const submitRes = await axios.post(
            `${workingApi}/payments/${paymentId}/submit`,
            { txid: signedTxXdr },
            { headers: { 
                'Authorization': `Key ${API_KEY}`, 
                'Content-Type': 'application/json' 
            }}
        );
        console.log("✅ Dihantar:", submitRes.data);

        const txid = submitRes.data.txid;

        // COMPLETE
        console.log("📤 Melengkapkan pembayaran...");
        const completeRes = await axios.post(
            `${workingApi}/payments/${paymentId}/complete`,
            { txid },
            { headers: { 
                'Authorization': `Key ${API_KEY}`, 
                'Content-Type': 'application/json' 
            }}
        );
        console.log("✅ Lengkap:", completeRes.data);

        return res.status(200).json({
            success: true,
            api_used: workingApi,
            paymentId,
            txid,
            testResults: testResults
        });

    } catch (error) {
        console.error("❌ Ralat Pembayaran:");
        console.error("   Status:", error.response?.status);
        console.error("   Data:", JSON.stringify(error.response?.data, null, 2));
        console.error("   Message:", error.message);

        // Kembalikan info debugging
        return res.status(error.response?.status || 500).json({
            error: error.response?.data?.error || error.message,
            api_used: workingApi,
            testResults: testResults,
            details: error.response?.data
        });
    }
                                           }
