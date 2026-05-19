import axios from 'axios';

export default async function handler(req, res) {
    // 1. METHOD CHECK (SOP)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Kaedah Tidak Dibenarkan' });
    }

    // 2. INPUT
    const { uid, accessToken } = req.body;
    const BASE = 'https://api.minepi.com/v2';

    // 3. SEMAK PARAMETER
    if (!uid || !accessToken) {
        return res.status(400).json({ error: "Parameter uid, accessToken diperlukan" });
    }

    // 4. LOG INPUT
    console.log("📦 INPUT:");
    console.log("   uid:", uid);
    console.log("   token length:", accessToken?.length);
    console.log("   token prefix:", accessToken?.substring(0, 30) + '...');
    console.log("   token suffix:", '...' + accessToken?.substring(accessToken.length - 10));

    // 5. TEST ME SAHAJA - TIADA TRANSAKSI
    try {
        console.log("🔍 TEST: ME dengan token");
        const meRes = await axios.get(`${BASE}/me`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        console.log("✅ ME OK:", meRes.data.username);
        console.log("   UID dari ME:", meRes.data.uid);
        console.log("   UID dari request:", uid);
        console.log("   UID sama?", meRes.data.uid === uid);
        
        return res.status(200).json({
            success: true,
            me_uid: meRes.data.uid,
            request_uid: uid,
            uid_match: meRes.data.uid === uid,
            username: meRes.data.username
        });
        
    } catch (error) {
        console.error("❌ ME gagal:", error.response?.status, error.response?.data);
        return res.status(200).json({
            success: false,
            error: "User not found",
            status: error.response?.status,
            data: error.response?.data,
            uid_sent: uid
        });
    }
}
