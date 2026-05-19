import axios from 'axios';

export default async function handler(req, res) {
    // 1. METHOD CHECK (SOP)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Kaedah Tidak Dibenarkan' });
    }

    // 2. INPUT & KONFIGURASI
    const { uid, accessToken } = req.body;
    const API_KEY = process.env.PI_API_KEY_TESTNET;

    // 3. SEMAK PARAMETER (SOP)
    if (!uid || !accessToken) {
        return res.status(400).json({ error: "Parameter uid, accessToken diperlukan" });
    }

    // 4. SAHKAN ACCESS TOKEN (SOP - WAJIB)
    try {
        const meRes = await axios.get('https://api.minepi.com/v2/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!meRes.data?.uid || meRes.data.uid !== uid) {
            return res.status(401).json({ error: "Access token tidak sah" });
        }
    } catch (error) {
        return res.status(401).json({ error: "Gagal mengesahkan access token" });
    }

    // 5. UJI POST /payments PADA PELBAGAI URL
    const urls = [
        'https://api.minepi.com/v2/payments',
        'https://api.minepi.com/payments',
        'https://api.testnet.minepi.com/v2/payments',
        'https://api.testnet.minepi.com/payments',
    ];

    const results = [];

    for (const url of urls) {
        try {
            const res = await axios.post(url, {
                amount: 0.1,
                memo: 'TEST-SOP',
                metadata: { test: true },
                uid: uid
            }, {
                headers: {
                    'Authorization': `Key ${API_KEY}`,
                    'Content-Type': 'application/json',
                    'Idempotency-Key': `test-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
                },
                validateStatus: (s) => true
            });

            results.push({
                url,
                status: res.status
            });

        } catch (e) {
            results.push({
                url,
                error: e.code || e.message
            });
        }
    }

    return res.status(200).json({ results });
}
