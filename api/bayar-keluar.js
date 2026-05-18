import Pi from 'pi-backend';

const pi = new Pi({
    apiKey: process.env.PI_API_KEY_TESTNET,
    walletPrivateSeed: process.env.WALLET_PRIVATE_SEED,
    baseURL: "https://api.minepi.com/v2"
});

export default async function handler(req, res) {
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
    
    const BASE_URL = "https://api.minepi.com/v2";
    
    try {
        // Sahkan access token (guna fetch - lebih dipercayai)
        const meRes = await fetch(`${BASE_URL}/me`, {
            headers: { "Authorization": `Bearer ${accessToken}` }
        });
        
        if (!meRes.ok) {
            return res.status(401).json({ success: false, error: "Access token tidak sah" });
        }
        
        // Guna SDK untuk create payment
        const paymentData = {
            amount: parseFloat(amount),
            memo: memo || "A2U Reward",
            uid: uid,
            metadata: { source: "claim_reward" }
        };
        
        const paymentId = await pi.createPayment(paymentData);
        
        // Submit guna fetch
        const submitRes = await fetch(`${BASE_URL}/payments/${paymentId}/submit`, {
            method: "POST",
            headers: { "Authorization": `Key ${process.env.PI_API_KEY_TESTNET}`, "Content-Type": "application/json" },
            body: JSON.stringify({ seed: process.env.WALLET_PRIVATE_SEED })
        });
        
        const submitData = await submitRes.json();
        
        if (!submitRes.ok || !submitData.txid) {
            return res.status(400).json({ success: false, error: "Submit failed" });
        }
        
        // Complete guna fetch
        await fetch(`${BASE_URL}/payments/${paymentId}/complete`, {
            method: "POST",
            headers: { "Authorization": `Key ${process.env.PI_API_KEY_TESTNET}`, "Content-Type": "application/json" },
            body: JSON.stringify({ txid: submitData.txid })
        });
        
        return res.status(200).json({ success: true, message: "Berjaya!", txid: submitData.txid });
        
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message || "Gagal" });
    }
}
