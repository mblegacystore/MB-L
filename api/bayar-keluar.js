import axios from 'axios';
import PiNetwork from 'pi-backend';

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

    // 1. ME
    try {
        const meRes = await axios.get('https://api.minepi.com/v2/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        console.log("✅ ME OK:", meRes.data.username);
    } catch (error) {
        return res.status(401).json({ error: "Token tidak sah" });
    }

    // 2. CREATE PAYMENT SAHAJA - TAK SUBMIT, TAK COMPLETE
    try {
        const pi = new PiNetwork(API_KEY, WALLET_SEED);
        
        console.log("💳 Cuba createPayment...");
        const paymentId = await pi.createPayment({
            amount: parseFloat(amount),
            memo: 'MB-LEGACY-A2U',
            metadata: metadata || {},
            uid: uid
        });
        
        console.log("✅ Payment ID:", paymentId);
        
        return res.status(200).json({
            success: true,
            message: "Payment created - TIDAK DIHANTAR",
            paymentId
        });
        
    } catch (error) {
        console.error("❌ Gagal:", error.message);
        return res.status(500).json({
            error: error.message
        });
    }
}
