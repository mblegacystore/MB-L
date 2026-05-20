import axios from 'axios';

export default async function handler(req, res) {
    // 1. METHOD CHECK (SOP)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Kaedah Tidak Dibenarkan' });
    }

    // 2. INPUT & KONFIGURASI
    const { uid, accessToken } = req.body;
    const BASE = 'https://api.minepi.com/v2';

    // 3. SEMAK PARAMETER (SOP)
    if (!uid || !accessToken) {
        return res.status(400).json({ error: "Parameter uid, accessToken diperlukan" });
    }

    // 4. SAHKAN ACCESS TOKEN (SOP - WAJIB)
    try {
        console.log("👤 Mengesahkan token...");
        console.log("   UID dari frontend:", uid);
        console.log("   Token panjang:", accessToken?.length);

        const meRes = await axios.get(`${BASE}/me`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        console.log("   UID dari Pi API:", meRes.data?.uid);
        console.log("   Username:", meRes.data?.username);

        // SOP: UID MESTI SAMA
        if (!meRes.data?.uid) {
            return res.status(401).json({ error: "Access token tidak sah - tiada UID" });
        }

        if (meRes.data.uid !== uid) {
            return res.status(401).json({ 
                error: "UID tidak sepadan",
                uid_dari_frontend: uid,
                uid_dari_pi_api: meRes.data.uid
            });
        }

        console.log("✅ Token sah");
        return res.status(200).json({
            success: true,
            message: "Token dan UID sah",
            username: meRes.data.username
        });

    } catch (error) {
        console.error("❌ Ralat:", error.response?.status, error.response?.data);
        return res.status(401).json({ 
            error: error.response?.data?.error || "Gagal mengesahkan access token" 
        });
    }
}
