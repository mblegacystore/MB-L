export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { username } = req.body;
    
    if (!username) {
        return res.status(400).json({ error: 'username diperlukan' });
    }
    
    const API_KEY = process.env.PI_API_KEY_TESTNET;
    const BASE_URL = "https://api.minepi.com/v2";
    
    console.log(`[CARI-UID] Mencari UID untuk: ${username}`);
    
    try {
        const userRes = await fetch(`${BASE_URL}/users?username=${username}`, {
            headers: { "Authorization": `Key ${API_KEY}` }
        });
        
        console.log(`[CARI-UID] Status: ${userRes.status}`);
        
        if (userRes.ok) {
            const userData = await userRes.json();
            console.log(`[CARI-UID] Data:`, JSON.stringify(userData));
            return res.status(200).json({ success: true, data: userData });
        }
        
        return res.status(404).json({ error: "Pengguna tidak ditemui" });
        
    } catch (error) {
        console.error(`[CARI-UID] Ralat:`, error.message);
        return res.status(500).json({ error: error.message });
    }
}
