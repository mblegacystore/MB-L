function paparAnimasiAmaran() {
    var footer = document.querySelector(".footer-frame p");
    if (footer) {
        setInterval(function() {
            footer.style.opacity = footer.style.opacity === "0.3" ? "1" : "0.3";
        }, 500);
    }
}

function sahkanTransaksi(jumlah) {
    return confirm("Sahkan pembayaran " + jumlah + " Pi? Pastikan anda di laman rasmi MB LEGACY STORE.");
}

window.addEventListener("DOMContentLoaded", paparAnimasiAmaran);
