import axios from 'axios';

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
        
        const BASE_URL = "https://api.minepi.com/v2";
        
        // Sahkan token (Bearer)
        const meRes = await axios.get(`${BASE_URL}/me`, {
            headers: { "Authorization": `Bearer ${accessToken}` }
        });
        
        // Cipta pembayaran (Key)
        const createRes = await axios.post(`${BASE_URL}/payments`, {
            amount: parseFloat(amount),
            memo: memo || "A2U",
            uid: uid,
            metadata: { source: "claim_reward" }
        }, {
            headers: { "Authorization": `Key ${API_KEY}` }
        });
        
        const paymentId = createRes.data.identifier;
        
        // Submit
        const submitRes = await axios.post(`${BASE_URL}/payments/${paymentId}/submit`, {
            seed: WALLET_SEED
        }, {
            headers: { "Authorization": `Key ${API_KEY}` }
        });
        
        // Complete
        await axios.post(`${BASE_URL}/payments/${paymentId}/complete`, {
            txid: submitRes.data.txid
        }, {
            headers: { "Authorization": `Key ${API_KEY}` }
        });
        
        return res.status(200).json({ success: true, message: "Berjaya!" });
        
    } catch (error) {
        return res.status(error.response?.status || 500).json({ 
            success: false, 
            error: error.response?.data?.message || error.message 
        });
    }
}
