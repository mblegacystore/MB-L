// bayar-keluar.js – Hantar Pi kepada pengguna (A2U)
export default async function handler(req, res) {
    const { paymentId, action, txid } = req.body || {};
    if (!paymentId || !action) return res.status(400).json({ error: "Data tak lengkap" });

    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.PI_WALLET_PRIVATE_SEED;
    const BASE = "https://api.minepi.com/v2";

    try {
        if (action === "approve") {
            await fetch(`${BASE}/payments/${paymentId}/approve`, {
                method: "POST",
                headers: { Authorization: `Key ${API_KEY}` }
            });
            return res.status(200).json({ success: true, message: "Approved" });
        }

        if (action === "complete") {
            let finalTxid = txid;
            if (!finalTxid && WALLET_SEED) {
                const submitRes = await fetch(`${BASE}/payments/${paymentId}/submit`, {
                    method: "POST",
                    headers: {
                        Authorization: `Key ${API_KEY}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ seed: WALLET_SEED })
                });
                const submitData = await submitRes.json();
                finalTxid = submitData.txid;
            }
            if (!finalTxid) throw new Error("Tiada txid");

            await fetch(`${BASE}/payments/${paymentId}/complete`, {
                method: "POST",
                headers: {
                    Authorization: `Key ${API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ txid: finalTxid })
            });
            return res.status(200).json({ success: true, message: "Completed" });
        }

        return res.status(400).json({ error: "Tindakan tak sah" });
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message });
    }
}
