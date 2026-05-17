export default async function handler(req, res) {
    const { paymentId } = req.body || {};
    if (!paymentId) return res.status(400).json({ error: "paymentId missing" });

    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;  // ✅ Guna nama ENV yang sama
    const BASE = "https://api.minepi.com/v2";

    try {
        // ✅ Guna /submit, bukan /approve
        const submitRes = await fetch(`${BASE}/payments/${paymentId}/submit`, {
            method: "POST",
            headers: { 
                "Authorization": `Key ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ seed: WALLET_SEED })
        });

        const submitData = await submitRes.json();

        if (!submitRes.ok) {
            return res.status(400).json({ error: submitData.message || "Gagal submit" });
        }

        return res.status(200).json({ 
            success: true, 
            txid: submitData.txid  // ✅ Hantar balik txid untuk complete nanti
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
