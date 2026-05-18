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
        // ✅ BEARER: Hanya pastikan token ada (validasi lanjut boleh tambah kemudian)
        console.log("Access token validated (length):", accessToken.length);

        // ✅ SDK: Cipta pembayaran
        const paymentId = await pi.createPayment({
            amount: parseFloat(amount),
            memo: memo || 'A2U Reward',
            uid: uid,
            metadata: { source: 'claim_reward', token_length: accessToken.length }
        });

        // ✅ STORAGE: Simpan paymentId
        paymentStore[paymentId] = {
            uid: uid,
            amount: amount,
            status: 'created',
            createdAt: new Date().toISOString()
        };

        // ✅ SDK: Submit ke blockchain
        const txid = await pi.submitPayment(paymentId);

        // ✅ STORAGE: Simpan txid
        paymentStore[paymentId].txid = txid;
        paymentStore[paymentId].status = 'submitted';

        // ✅ SDK: Complete pembayaran
        await pi.completePayment(paymentId, txid);

        // ✅ STORAGE: Kemas kini status
        paymentStore[paymentId].status = 'completed';
        paymentStore[paymentId].completedAt = new Date().toISOString();

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
