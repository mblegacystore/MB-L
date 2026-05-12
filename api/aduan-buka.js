// aduan-buka.js – Buka pertikaian
export default async function handler(req, res) {
    const { pesanan_id, pembeli_id, sebab } = req.body || {};
    if (!pesanan_id || !pembeli_id || !sebab) return res.status(400).json({ error: "Data tak lengkap" });

    return res.status(200).json({
        success: true,
        message: "Aduan berjaya dibuka",
        data: { pesanan_id, pembeli_id, sebab, status: "siasatan" }
    });
}
