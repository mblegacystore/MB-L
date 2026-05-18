import Pi from 'pi-backend';

// ✅ PI SDK CONFIG
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
        return res.status(400).json({ error: "Data tak lengkap" });
    }
    
    if (!accessToken) {
        return res.status(400).json({ error: "Access token missing" });
    }
    
    try {
        // Langkah 1: Sahkan access token
        const me = await pi.getUser(accessToken);
        
        if (!me || me.uid !== uid) {
            return res.status(401).json({ 
                success: false, 
                error: "Access token tidak sah atau UID tidak sepadan" 
            });
        }
        
        // Langkah 2: Cipta pembayaran A2U
        const payment = await pi.createPayment({
            amount: parseFloat(amount),
            memo: memo || "A2U",
            uid: uid,
            metadata: { source: "claim_reward" }
        });
        
        // Langkah 3: Submit ke blockchain
        const txid = await pi.submitPayment(payment.identifier);
        
        // Langkah 4: Complete
        await pi.completePayment(payment.identifier, txid);
        
        return res.status(200).json({ 
            success: true, 
            message: "0.1 Pi berjaya dihantar!",
            txid: txid
        });
        
    } catch (error) {
        return res.status(400).json({ 
            success: false, 
            error: error.message || "Gagal" 
        });
    }
}
