export default async function handler(req, res) {
    const { paymentId, txid } = req.body || {};
    if (!paymentId) return res.status(200).json({ success: true, message: "Tiada paymentId" });

    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const WALLET_SEED = process.env.WALLET_PRIVATE_SEED;   // ✅ tanpa PI_
    const BASE = "https://api.minepi.com/v2";

    try {
        if (txid) {
            try {
                await fetch(`${BASE}/payments/${paymentId}/complete`, {
                    method: "POST",
                    headers: { Authorization: `Key ${API_KEY}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ txid })
                });
                return res.status(200).json({ success: true, message: "Force complete" });
            } catch (e) {}
        }

        if (WALLET_SEED) {
            try {
                const sr = await fetch(`${BASE}/payments/${paymentId}/submit`, {
                    method: "POST",
                    headers: { Authorization: `Key ${API_KEY}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ seed: WALLET_SEED })
                });
                const sd = await sr.json();
                if (sd.txid) {
                    await fetch(`${BASE}/payments/${paymentId}/complete`, {
                        method: "POST",
                        headers: { Authorization: `Key ${API_KEY}`, "Content-Type": "application/json" },
                        body: JSON.stringify({ txid: sd.txid })
                    });
                    return res.status(200).json({ success: true, message: "Submit + complete" });
                }
            } catch (e) {}
        }

        await fetch(`${BASE}/payments/${paymentId}/cancel`, {
            method: "POST",
            headers: { Authorization: `Key ${API_KEY}` }
        });
        return res.status(200).json({ success: true, message: "Dibatalkan" });
    } catch (e) {
        return res.status(200).json({ success: true, message: "Dibersihkan" });
    }
}
