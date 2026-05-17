export default async function handler(req, res) {
    // Hanya terima POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { uid, amount } = req.body;
    
    // Balikkan response ringkas (tanpa panggil Pi API)
    return res.status(200).json({ 
        success: true, 
        message: "Test berjaya",
        uid_received: uid,
        amount_received: amount
    });
}
