import axios from 'axios';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Kaedah Tidak Dibenarkan' });
    }

    const { uid, amount, accessToken, metadata } = req.body;
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;

    if (!uid || !amount || !accessToken) {
        return res.status(400).json({ error: "Parameter diperlukan" });
    }

    // 1. SAHKAN TOKEN
    try {
        const meRes = await axios.get('https://api.minepi.com/v2/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!meRes.data?.uid || meRes.data.uid !== uid) {
            return res.status(401).json({ error: "Access token tidak sah" });
        }
        console.log("✅ ME OK:", meRes.data.username);
    } catch (error) {
        return res.status(401).json({ error: "Gagal mengesahkan access token" });
    }

    // 2. TEST CREATE PAYMENT SAHAJA (TANPA SUBMIT)
    try {
        const { default: PiNetwork } = await import('pi-backend');
        const pi = new PiNetwork(API_KEY, WALLET_SEED);
        
        console.log("💳 createPayment...");
        const paymentId = await pi.createPayment({
            amount: parseFloat(amount),
            memo: 'MB-LEGACY-A2U',
            metadata: metadata || {},
            uid: uid
        });
        
        console.log("✅ Payment ID:", paymentId);
        
        return res.status(200).json({
            success: true,
            message: "CREATE ONLY - TIADA SUBMIT",
            paymentId
        });
        
    } catch (error) {
        console.error("❌ createPayment gagal:", error.message, error.data);
        return res.status(500).json({
            error: error.message,
            details: error.data
        });
    }
}
