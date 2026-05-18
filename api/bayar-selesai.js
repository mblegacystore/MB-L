export default async function handler(req, res) {
    const { paymentId } = req.body || {};
    if (!paymentId) return res.status(400).json({ error: "paymentId missing" });

    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const BASE = "https://api.minepi.com/v2";

    try {
        const approveRes = await fetch(`${BASE}/payments/${paymentId}/approve`, {
            method: "POST",
            headers: { 
                "Authorization": `Key ${API_KEY}`,
                "Content-Type": "application/json"
            }
        });

        if (!approveRes.ok) {
            const errorData = await approveRes.json();
            return res.status(400).json({ error: errorData.message || "Gagal approve" });
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
