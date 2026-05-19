export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { uid, amount, accessToken } = req.body;

    if (!uid || !amount) {
        return res.status(400).json({ error: "Data tak lengkap" });
    }

    if (!accessToken) {
        return res.status(400).json({ error: "Access token missing" });
    }

    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const BASE_URL = "https://api.minepi.com/v2";

    try {
        const createRes = await fetch(`${BASE_URL}/payments`, {
            method: "POST",
            headers: { 
                "Authorization": `Key ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                amount: parseFloat(amount),
                memo: "A2U Debug",
                uid: uid,
                accessToken: accessToken
            })
        });

        const createData = await createRes.json();

        return res.status(createRes.ok ? 200 : 400).json({
            ok: createRes.ok,
            status: createRes.status,
            error: createData.error,
            message: createData.message,
            fullResponse: createData,
            uid_sent: uid,
            hasAccessToken: !!accessToken
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
