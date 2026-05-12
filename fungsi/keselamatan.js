function paparAmaran() {
    console.log("MB LEGACY STORE TIDAK AKAN MEMINTA FRASA LALUAN WALLET ANDA!");
}

function sahkanTransaksi(jumlah) {
    return confirm("Sahkan pembayaran " + jumlah + " Pi? Pastikan anda berada di laman rasmi MB Legacy Store.");
}

function kesanPancingData() {
    if (window.location.hostname !== "mb-l.vercel.app" && window.location.hostname !== "localhost") {
        document.body.innerHTML = "<h1 style='color:red;text-align:center;'>AMARAN: Laman tidak sah!</h1>";
    }
}

kesanPancingData();
paparAmaran();
