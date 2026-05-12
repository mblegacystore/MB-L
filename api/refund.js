export default async function handler(req, res) {
    const { paymentId, amount, wallet_address } = req.body || {};
    if (!paymentId || !wallet_address || !amount) return res.status(400).json({ error: "Data tak lengkap" });

    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.PI_WALLET_PRIVATE_SEED;
    const BASE = "https://api.minepi.com/v2";

    try {
        const pr = await fetch(`${BASE}/payments`, {
            method: "POST",
            headers: { Authorization: `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ amount, memo: "Refund", metadata: { paymentId }, uid: wallet_address })
        });
        const pd = await pr.json();

        await fetch(`${BASE}/payments/${pd.identifier}/approve`, {
            method: "POST",
            headers: { Authorization: `Key ${API_KEY}` }
        });

        const sr = await fetch(`${BASE}/payments/${pd.identifier}/submit`, {
            method: "POST",
            headers: { Authorization: `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ seed: WALLET_SEED })
        });
        const sd = await sr.json();

        await fetch(`${BASE}/payments/${pd.identifier}/complete`, {
            method: "POST",
            headers: { Authorization: `Key ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ txid: sd.txid })
        });

        return res.status(200).json({ success: true, message: "Refund berjaya" });
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message });
    }
}
