// 💰-bayar-sah.js – Sahkan pembayaran baru
export default async function handler(req, res) {
    const { paymentId } = req.body || {};
    if (!paymentId) return res.status(400).json({ error: "paymentId missing" });

    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const BASE = "https://api.minepi.com/v2";

    await fetch(`${BASE}/payments/${paymentId}/approve`, {
        method: "POST",
        headers: { Authorization: `Key ${API_KEY}` }
    });

    return res.status(200).json({ success: true });
}
