import Pi from 'pi-backend';

const pi = new Pi({
    apiKey: process.env.PI_API_KEY_TESTNET,
    walletPrivateSeed: process.env.WALLET_PRIVATE_SEED,
    baseURL: "https://api.minepi.com/v2"
});

export default async function handler(req, res) {
    try {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }
        
        const { uid, amount, memo, accessToken } = req.body;
        
        if (!uid || !amount) {
            return res.status(400).json({ success: false, error: "Data tak lengkap" });
        }
        
        if (!accessToken) {
            return res.status(400).json({ success: false, error: "Access token missing" });
        }
        
        // Sahkan access token
        const me = await pi.getUser(accessToken);
        
        if (!me || me.uid !== uid) {
            return res.status(401).json({ success: false, error: "Access token tidak sah" });
        }
        
        // Cipta pembayaran A2U
        const paymentData = {
            amount: parseFloat(amount),
            memo: memo || "A2U Reward",
            uid: uid,
            metadata: { source: "claim_reward" }
        };
        
        const paymentId = await pi.createPayment(paymentData);
        
        // Submit
        const txid = await pi.submitPayment(paymentId);
        
        // Complete
        const payment = await pi.completePayment(paymentId, txid);
        
        return res.status(200).json({ 
            success: true, 
            message: "0.1 Pi berjaya dihantar!",
            paymentId: paymentId,
            txid: txid
        });
        
    } catch (error) {
        return res.status(400).json({ 
            success: false, 
            error: error.message || "Gagal" 
        });
    }
}
