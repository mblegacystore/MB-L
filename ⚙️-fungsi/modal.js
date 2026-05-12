// modal.js – Tingkap timbul
function showFreeContent() {
    document.getElementById("modalBody").innerHTML = "<h2>THE PI SENTINEL DOSSIER</h2><p>Panduan strategik untuk Pioneer. Selamat berdagang dalam ekosistem Pi.</p>";
    document.getElementById("productModal").style.display = "block";
}

function showEchelonReport() {
    document.getElementById("modalBody").innerHTML = "<h2>PEK TAKLIMAT ECHELON</h2><p>Aset perisikan tahap lanjutan. Dilindungi oleh protokol keselamatan Pi.</p>";
    document.getElementById("productModal").style.display = "block";
}

function showLockedContent(type) {
    if (type === "command") {
        document.getElementById("modalBody").innerHTML = "<h2>SUIT PUSAT KAWALAN</h2><p>Protokol kawalan pentadbiran penuh. Akses diberikan.</p>";
    }
    document.getElementById("productModal").style.display = "block";
}

document.addEventListener("click", function(e) {
    if (e.target.id === "productModal") {
        document.getElementById("productModal").style.display = "none";
    }
});
