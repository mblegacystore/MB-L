import Pi from 'pi-backend';

const pi = new Pi({
    apiKey: process.env.PI_API_KEY_TESTNET,
    walletPrivateSeed: process.env.WALLET_PRIVATE_SEED,
    baseURL: 'https://api.minepi.com/v2'
});

let paymentStore = {};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { uid, amount, memo, accessToken } = req.body;

    if (!uid || !amount) {
        return res.status(400).json({ success: false, error: 'Data tak lengkap' });
    }

    if (!accessToken) {
        return res.status(400).json({ success: false, error: 'Access token missing' });
    }

    try {
        // ✅ CREATE PAYMENT
        const paymentId = await pi.createPayment({
            amount: parseFloat(amount),
            memo: memo || 'A2U Reward',
            uid: uid,
            metadata: { source: 'claim_reward' }
        });

        paymentStore[paymentId] = { uid, amount, status: 'created' };

        // ✅ SUBMIT PAYMENT
        const txid = await pi.submitPayment(paymentId);
        paymentStore[paymentId].txid = txid;
        paymentStore[paymentId].status = 'submitted';

        // ✅ COMPLETE PAYMENT
        await pi.completePayment(paymentId, txid);
        paymentStore[paymentId].status = 'completed';

        return res.status(200).json({
            success: true,
            message: '0.1 Pi berjaya dihantar!',
            paymentId: paymentId,
            txid: txid
        });

    } catch (error) {
        console.error("A2U Error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
