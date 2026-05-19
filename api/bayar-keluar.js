import axios from 'axios';
import PiNetwork from 'pi-backend';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Kaedah Tidak Dibenarkan' });
    }

    const { uid, amount, accessToken, metadata } = req.body;
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;

    if (!API_KEY || !WALLET_SEED) {
        return res.status(500).json({ error: "Konfigurasi server tidak lengkap" });
    }

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
    } catch (error) {
        return res.status(401).json({ error: "Gagal mengesahkan access token" });
    }

    // 2. A2U GUNA SDK RASMI
    try {
        const pi = new PiNetwork(API_KEY, WALLET_SEED);

        const paymentId = await pi.createPayment({
            amount: parseFloat(amount),
            memo: 'MB-LEGACY-A2U',
            metadata: metadata || {},
            uid: uid
        });

        const txid = await pi.submitPayment(paymentId);
        await pi.completePayment(paymentId, txid);

        return res.status(200).json({
            success: true,
            paymentId,
            txid
        });

    } catch (error) {
        return res.status(error.status || 500).json({
            error: error.message || "Ralat pembayaran"
        });
    }
}
