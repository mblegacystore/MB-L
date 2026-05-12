// pesanan-status.js – Kemaskini status pesanan
export default async function handler(req, res) {
    const { pesanan_id, status } = req.body || {};
    if (!pesanan_id || !status) return res.status(400).json({ error: "Data tak lengkap" });

    const statusSah = ["diproses", "dihantar", "selesai", "batal"];
    if (!statusSah.includes(status)) return res.status(400).json({ error: "Status tak sah" });

    return res.status(200).json({
        success: true,
        message: "Status dikemaskini",
        data: { pesanan_id, status }
    });
}
