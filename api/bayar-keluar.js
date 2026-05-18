import Pi from 'pi-backend';

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
    
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;
    
    if (!API_KEY) return res.status(500).json({ error: "API Key missing" });
    if (!WALLET_SEED) return res.status(500).json({ error: "Wallet Seed missing" });
    
    try {
        // Guna Pi Backend SDK
        const pi = new Pi({
            apiKey: API_KEY,
            walletPrivateSeed: WALLET_SEED,
            baseURL: "https://api.minepi.com/v2"
        });
        
        // Sahkan access token
        const me = await pi.getUser(accessToken);
        
        if (!me || me.uid !== uid) {
            return res.status(401).json({ 
                success: false, 
                error: "Access token tidak sah atau UID tidak sepadan" 
            });
        }
        
        // Cipta pembayaran A2U
        const payment = await pi.createPayment({
            amount: parseFloat(amount),
            memo: memo || "A2U",
            uid: uid,
            metadata: { source: "claim_reward" }
        });
        
        // Submit ke blockchain
        const txid = await pi.submitPayment(payment.identifier, WALLET_SEED);
        
        // Complete
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
