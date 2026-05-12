// 🔧-utiliti.js – Fungsi bantuan
function formatPi(jumlah) {
    return parseFloat(jumlah).toFixed(7) + " Pi";
}

function formatTarikh(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString("ms-MY", { year: "numeric", month: "long", day: "numeric" });
}

function validasiWallet(alamat) {
    return alamat && alamat.startsWith("G") && alamat.length > 40;
}

function ringkaskanTajuk(teks, panjang) {
    if (teks.length > panjang) return teks.substring(0, panjang) + "...";
    return teks;
}

function tunggu(saat) {
    return new Promise(function(resolve) {
        setTimeout(resolve, saat * 1000);
    });
}
