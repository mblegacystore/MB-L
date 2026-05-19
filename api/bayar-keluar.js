import axios from 'axios';
import PiNetwork from 'pi-backend';

// Simpanan sementara guna Map (guna database sebenar untuk production)
const paymentStore = new Map();

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

    try {
        const pi = new PiNetwork(API_KEY, WALLET_SEED);

        // 2. CIPTA PEMBAYARAN
        const paymentData = {
            amount: parseFloat(amount),
            memo: 'MB-LEGACY-A2U',
            metadata: metadata || {},
            uid: uid
        };
        
        const paymentId = await pi.createPayment(paymentData);

        // 3. SIMPAN PAYMENT ID (SOP - KRITIKAL)
        paymentStore.set(paymentId, {
            uid: uid,
            amount: parseFloat(amount),
            memo: 'MB-LEGACY-A2U',
            metadata: metadata || {},
            paymentId: paymentId,
            txid: null,
            status: 'created',
            createdAt: new Date().toISOString()
        });
        
        console.log("💾 Disimpan:", paymentId);

        // 4. SUBMIT
        const txid = await pi.submitPayment(paymentId);

        // 5. SIMPAN TXID (SOP - DISYORKAN)
        const payment = paymentStore.get(paymentId);
        payment.txid = txid;
        payment.status = 'submitted';
        paymentStore.set(paymentId, payment);
        
        console.log("💾 Dikemaskini:", paymentId, txid);

        // 6. COMPLETE
        const completedPayment = await pi.completePayment(paymentId, txid);

        // 7. KEMASKINI STATUS
        payment.status = 'completed';
        payment.completedAt = new Date().toISOString();
        paymentStore.set(paymentId, payment);

        return res.status(200).json({
            success: true,
            paymentId,
            txid,
            status: completedPayment.status
        });

    } catch (error) {
        return res.status(error.status || 500).json({
            error: error.message || "Ralat pembayaran"
        });
    }
}
