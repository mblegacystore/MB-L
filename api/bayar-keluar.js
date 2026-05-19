import axios from 'axios';

export default async function handler(req, res) {
    // 1. METHOD CHECK (SOP)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Kaedah Tidak Dibenarkan' });
    }

    // 2. INPUT & KONFIGURASI
    const { uid, accessToken } = req.body;
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;

    // 3. SEMAK PARAMETER
    if (!uid || !accessToken) {
        return res.status(400).json({ error: "Parameter uid, accessToken diperlukan" });
    }

    // 4. LOG CONFIG (tanpa dedah full secret)
    console.log("📋 CONFIG:");
    console.log("   API_KEY exists:", !!API_KEY);
    console.log("   API_KEY length:", API_KEY?.length);
    console.log("   WALLET_SEED exists:", !!WALLET_SEED);
    console.log("   WALLET_SEED prefix:", WALLET_SEED?.substring(0, 5));

    // 5. TEST IMPORT PI-BACKEND (TIADA TRANSAKSI)
    try {
        console.log("📦 Import pi-backend...");
        const { default: PiNetwork } = await import('pi-backend');
        console.log("✅ Import OK");
        
        console.log("🔧 Initialize PiNetwork...");
        const pi = new PiNetwork(API_KEY, WALLET_SEED);
        console.log("✅ Initialize OK");
        
        return res.status(200).json({
            success: true,
            message: "pi-backend OK - TIADA TRANSAKSI",
            config: {
                hasApiKey: !!API_KEY,
                hasSeed: !!WALLET_SEED
            }
        });
        
    } catch (error) {
        console.error("❌ pi-backend error:", error.message);
        console.error("   Type:", error.constructor.name);
        
        return res.status(200).json({
            success: false,
            error: error.message,
            type: error.constructor.name
        });
    }
}
