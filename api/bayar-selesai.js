export default async function handler(req, res) {
    const { paymentId, txid } = req.body || {};
    if (!paymentId || !txid) return res.status(400).json({ error: "paymentId/txid missing" });

    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const BASE = "https://api.minepi.com/v2";

    await fetch(`${BASE}/payments/${paymentId}/complete`, {
        method: "POST",
        headers: { Authorization: `Key ${API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ txid })
    });

    return res.status(200).json({ success: true });
}
