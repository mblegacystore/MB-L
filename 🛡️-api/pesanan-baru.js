// pesanan-baru.js – Cipta pesanan
export default async function handler(req, res) {
    const { produk_id, pembeli_id, jumlah, harga } = req.body || {};
    if (!produk_id || !pembeli_id || !jumlah) return res.status(400).json({ error: "Data tak lengkap" });

    return res.status(200).json({
        success: true,
        message: "Pesanan berjaya dicipta",
        data: { produk_id, pembeli_id, jumlah, harga, status: "baru" }
    });
}
