export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { uid, amount, memo } = req.body;
    
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;
    const BASE_URL = "https://api.minepi.com/v2";
    
    try {
        // CREATE
        const createRes = await fetch(`${BASE_URL}/payments`, {
            method: "POST",
            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ amount: parseFloat(amount), memo: memo || "Test", uid: uid })
        });
        
        const createData = await createRes.json();
        
        if (!createRes.ok) {
            return res.status(400).json({ 
                success: false, 
                error: createData.message || createData.error || "Create failed",
                pi_response: createData
            });
        }
        
        const paymentId = createData.identifier;
        
        // SUBMIT
        const submitRes = await fetch(`${BASE_URL}/payments/${paymentId}/submit`, {
            method: "POST",
            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ seed: WALLET_SEED })
        });
        
        const submitData = await submitRes.json();
        
        if (!submitRes.ok || !submitData.txid) {
            return res.status(400).json({ success: false, error: "Submit failed", pi_response: submitData });
        }
        
        // COMPLETE
        await fetch(`${BASE_URL}/payments/${paymentId}/complete`, {
            method: "POST",
            headers: { "Authorization": `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ txid: submitData.txid })
        });
        
        return res.status(200).json({ success: true, message: "OK", txid: submitData.txid });
        
    } catch(e) {
        return res.status(500).json({ success: false, error: e.message });
    }
}
