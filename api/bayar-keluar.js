import axios from 'axios';
import { Keypair, Transaction, Networks } from '@stellar/stellar-sdk';

export default async function handler(req, res) {
    console.log("🧪 TEST SELAMAT - Cari endpoint + sahkan konfigurasi");
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Kaedah Tidak Dibenarkan' });
    }

    const { uid, amount, accessToken } = req.body;
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;

    const results = {
        config: {},
        stellar: {},
        me: {},
        payments: {}
    };

    // ==========================================
    // TEST 1: Semak konfigurasi
    // ==========================================
    console.log("📋 TEST 1: Konfigurasi");
    results.config = {
        hasApiKey: !!API_KEY,
        apiKeyLength: API_KEY?.length || 0,
        apiKeyPrefix: API_KEY?.substring(0, 10) || 'null',
        hasWalletSeed: !!WALLET_SEED,
        seedLength: WALLET_SEED?.length || 0,
        seedPrefix: WALLET_SEED?.substring(0, 5) || 'null'
    };
    console.log("   API Key exists:", results.config.hasApiKey);
    console.log("   Wallet exists:", results.config.hasWalletSeed);

    // ==========================================
    // TEST 2: Stellar SDK
    // ==========================================
    console.log("🔏 TEST 2: Stellar SDK");
    try {
        if (!WALLET_SEED) {
            throw new Error("WALLET_SEED kosong");
        }
        const keypair = Keypair.fromSecret(WALLET_SEED);
        results.stellar = {
            success: true,
            publicKey: keypair.publicKey()
        };
        console.log("   ✅ OK:", results.stellar.publicKey);
    } catch (err) {
        results.stellar = {
            success: false,
            error: err.message
        };
        console.log("   ❌ GAGAL:", err.message);
    }

    // ==========================================
    // TEST 3: ME Endpoint (sahkan token)
    // ==========================================
    console.log("👤 TEST 3: ME Endpoint");
    if (accessToken) {
        // Cuba mainnet
        try {
            const me = await axios.get('https://api.minepi.com/v2/me', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            results.me = {
                url: 'https://api.minepi.com/v2/me',
                status: 200,
                success: true,
                uid: me.data?.uid,
                username: me.data?.username
            };
            console.log("   ✅ Mainnet OK:", me.data?.username);
        } catch (err) {
            results.me = {
                url: 'https://api.minepi.com/v2/me',
                status: err.response?.status,
                success: false,
                error: err.response?.data || err.message
            };
            console.log("   ❌ Mainnet:", err.response?.status);
        }
    } else {
        results.me = { error: "Tiada accessToken" };
        console.log("   ⚠️  Tiada accessToken untuk test");
    }

    // ==========================================
    // TEST 4: Payments Endpoint (GET sahaja)
    // ==========================================
    console.log("💳 TEST 4: Payments Endpoints");
    const paymentTests = [
        { label: 'Mainnet V2', url: 'https://api.minepi.com/v2/payments' },
        { label: 'Testnet V2', url: 'https://api.testnet.minepi.com/v2/payments' },
        { label: 'Testnet', url: 'https://api.testnet.minepi.com/payments' },
    ];

    results.payments = [];

    for (const test of paymentTests) {
        try {
            const res = await axios.get(test.url, {
                headers: { 'Authorization': `Key ${API_KEY}` },
                validateStatus: (s) => true
            });
            
            const entry = {
                label: test.label,
                url: test.url,
                status: res.status,
                success: res.status === 200
            };
            
            results.payments.push(entry);
            console.log(`   ${res.status === 200 ? '✅' : '❌'} ${test.label}: ${res.status}`);
            
        } catch (err) {
            results.payments.push({
                label: test.label,
                url: test.url,
                status: 'ERROR',
                success: false,
                error: err.code
            });
            console.log(`   ❌ ${test.label}: ${err.code}`);
        }
    }

    // ==========================================
    // RINGKASAN
    // ==========================================
    const summary = {
        configOk: results.config.hasApiKey && results.config.hasWalletSeed,
        stellarOk: results.stellar.success,
        meOk: results.me.success,
        paymentEndpointFound: results.payments.some(p => p.success)
    };

    console.log("\n📊 RINGKASAN:");
    console.log("   Config:", summary.configOk ? '✅' : '❌');
    console.log("   Stellar:", summary.stellarOk ? '✅' : '❌');
    console.log("   ME:", summary.meOk ? '✅' : '❌');
    console.log("   Payment:", summary.paymentEndpointFound ? '✅' : '❌');

    return res.status(200).json({
        message: "Test selesai - TIADA TRANSAKSI DIBUAT",
        summary,
        results
    });
}
