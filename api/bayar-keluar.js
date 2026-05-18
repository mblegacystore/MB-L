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
        // 1. BEARER: Sahkan access token
        const me = await pi.getUser(accessToken);
        if (!me || me.uid !== uid) {
            return res.status(401).json({ success: false, error: 'Token tidak sah' });
        }

        // 2. SDK: Cipta pembayaran
        const paymentId = await pi.createPayment({
            amount: parseFloat(amount),
            memo: memo || 'A2U Reward',
            uid: uid,
            metadata: { source: 'claim_reward' }
        });

        // 3. STORAGE: Simpan paymentId
        paymentStore[paymentId] = {
            uid: uid,
            amount: amount,
            status: 'created',
            createdAt: new Date().toISOString()
        };

        // 4. SDK: Submit ke blockchain
        const txid = await pi.submitPayment(paymentId);

        // 5. STORAGE: Simpan txid
        paymentStore[paymentId].txid = txid;
        paymentStore[paymentId].status = 'submitted';

        // 6. SDK: Complete pembayaran
        await pi.completePayment(paymentId, txid);

        // 7. STORAGE: Kemas kini status
        paymentStore[paymentId].status = 'completed';
        paymentStore[paymentId].completedAt = new Date().toISOString();

        return res.status(200).json({
            success: true,
            message: '0.1 Pi berjaya dihantar!',
            paymentId: paymentId,
            txid: txid
        });

    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
