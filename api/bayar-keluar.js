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
        
        const API_KEY = process.env.PI_API_KEY_TESTNET;
        const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;
        
        if (!API_KEY) return res.status(500).json({ success: false, error: "API Key missing" });
        if (!WALLET_SEED) return res.status(500).json({ success: false, error: "Wallet Seed missing" });
        
        const BASE_URL = "https://api.minepi.com/v1";
        
        // Sahkan access token
        const meRes = await fetch(`${BASE_URL}/me`, {
            headers: { "Authorization": `Bearer ${accessToken}` }
        });
        
        if (!meRes.ok) {
            return res.status(401).json({ success: false, error: "Access token tidak sah" });
        }
        
        const meData = await meRes.json();
        
        // Cipta pembayaran - guna /payments (BETUL)
        const createRes = await fetch(`${BASE_URL}/payments`, {
            method: "POST",
            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ 
                amount: parseFloat(amount), 
                memo: memo || "A2U", 
                uid: uid,
                metadata: { source: "claim_reward" }
            })
        });
        
        const createData = await createRes.json();
        
        if (!createRes.ok) {
            return res.status(400).json({ 
                success: false, 
                error: createData.message || createData.error || "Create failed",
                pi_error: createData
            });
        }
        
        // Submit
        const submitRes = await fetch(`${BASE_URL}/payments/${createData.identifier}/submit`, {
            method: "POST",
            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ seed: WALLET_SEED })
        });
        
        const submitData = await submitRes.json();
        
        if (!submitRes.ok || !submitData.txid) {
            return res.status(400).json({ success: false, error: "Submit failed", pi_error: submitData });
        }
        
        // Complete
        await fetch(`${BASE_URL}/payments/${createData.identifier}/complete`, {
            method: "POST",
            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ txid: submitData.txid })
        });
        
        return res.status(200).json({ success: true, message: "Berjaya!" });
        
    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            error: error.message,
            stack: error.stack 
        });
    }
}
