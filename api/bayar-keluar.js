export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { uid, amount, accessToken } = req.body;
    
    console.log("DEBUG - Backend called:", { uid, amount, hasToken: !!accessToken });
    
    // ✅ VALIDASI RINGKAS
    if (!uid || !amount) {
        return res.status(400).json({ success: false, error: 'Data tak lengkap' });
    }
    
    if (!accessToken) {
        return res.status(400).json({ success: false, error: 'Access token missing' });
    }
    
    // ✅ SIMULASI A2U (untuk ujian)
    return res.status(200).json({
        success: true,
        message: "0.1 Test-Pi dihantar (simulasi)",
        paymentId: "sim_" + Date.now(),
        txid: "sim_" + Date.now(),
        received: { uid, amount, hasToken: !!accessToken }
    });
}
