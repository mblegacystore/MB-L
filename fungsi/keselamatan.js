function paparAnimasiAmaran() {
    var footer = document.querySelector(".footer-frame");
    if (footer) {
        setInterval(function() {
            footer.style.opacity = footer.style.opacity === "0.6" ? "1" : "0.6";
        }, 400);
    }
}

function sahkanTransaksi(jumlah) {
    return confirm("Sahkan pembayaran " + jumlah + " Pi? Pastikan anda di laman rasmi MB LEGACY STORE.");
}

function kesanPancingData() {
    if (window.location.hostname !== "mb-l.vercel.app" && window.location.hostname !== "localhost") {
        document.body.innerHTML = "<div style='text-align:center;padding:50px;'><h1 style='color:#FFD700;'>AMARAN</h1><p style='color:#fff;'>Laman tidak sah! Sila gunakan laman rasmi.</p></div>";
    }
}

kesanPancingData();
window.addEventListener("DOMContentLoaded", paparAnimasiAmaran);
