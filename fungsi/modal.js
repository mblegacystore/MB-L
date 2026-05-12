function showFreeContent() {
    var html = '';
    if (typeof bahasa !== 'undefined' && bahasa === 'ms') {
        html = '<h3>DOSSIER PI SENTINEL</h3>' +
            '<p>Selamat datang, Pioneer. Anda sedang memegang salah satu dossier strategik paling eksklusif dalam ekosistem Pi.</p>' +
            '<h4 style="color:#FFD700;margin-top:15px;">1. Visi: Pelan Induk Pengasas</h4>' +
            '<p>Selami falsafah Dr. Nicolas Kokkalis dan Dr. Chengdiao Fan. Fahami mengapa Pi bukan sekadar mata wang kripto, tetapi satu gerakan untuk mendesentralisasi kewangan global.</p>' +
            '<h4 style="color:#FFD700;margin-top:15px;">2. Dompet: Kubu Digital Anda</h4>' +
            '<p>Dompet Pi adalah kubu peribadi anda di atas rantaian blok. Pelajari protokol keselamatan, strategi sandaran, dan maksud sebenar "Bukan kunci anda, bukan syiling anda."</p>' +
            '<h4 style="color:#FFD700;margin-top:15px;">3. Strategi: Melangkaui Butang "Lombong"</h4>' +
            '<p>Kembangkan lingkaran keselamatan, jalankan Pi Node, dan fahami bagaimana penglibatan harian anda mencipta utiliti sebenar untuk rangkaian.</p>' +
            '<p style="color:#FFD700;margin-top:15px;"><strong>Anda bukan lagi sekadar pengguna; anda adalah seorang Sentinel Rangkaian Pi.</strong></p>';
    } else {
        html = '<h3>THE PI SENTINEL DOSSIER</h3>' +
            '<p>Welcome, Pioneer. You are holding one of the most exclusive strategic dossiers in the Pi ecosystem.</p>' +
            '<h4 style="color:#FFD700;margin-top:15px;">1. The Vision: The Founders\' Masterplan</h4>' +
            '<p>A deep dive into the philosophy of Dr. Nicolas Kokkalis and Dr. Chengdiao Fan. Understand why Pi is not just a cryptocurrency, but a movement to decentralize global finance.</p>' +
            '<h4 style="color:#FFD700;margin-top:15px;">2. The Wallet: Your Digital Fortress</h4>' +
            '<p>The Pi Wallet is your personal fortress on the blockchain. Learn security protocols, backup strategies, and the real meaning of "Not your keys, not your coins."</p>' +
            '<h4 style="color:#FFD700;margin-top:15px;">3. The Strategy: Beyond the "Mining" Button</h4>' +
            '<p>Expand your security circle, run Pi Node, and understand how your daily engagement creates true utility for the network.</p>' +
            '<p style="color:#FFD700;margin-top:15px;"><strong>You are no longer just a user; you are a Sentinel of the Pi Network.</strong></p>';
    }
    html += '<button class="modal-close-btn" onclick="document.getElementById(\'productModal\').style.display=\'none\'">CLOSE</button>';
    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('productModal').style.display = 'flex';
}

function showEchelonReport() {
    document.getElementById('modalBody').innerHTML = '<h3>THE ECHELON BRIEFING PACK</h3><p>Advanced education module unlocked.</p><button class="modal-close-btn" onclick="document.getElementById(\'productModal\').style.display=\'none\'">CLOSE</button>';
    document.getElementById('productModal').style.display = 'flex';
}

function showLockedContent(type) {
    if (type === 'command') {
        document.getElementById('modalBody').innerHTML = '<h3>THE COMMAND CENTER SUITE</h3><p>Professional toolset unlocked.</p><button class="modal-close-btn" onclick="document.getElementById(\'productModal\').style.display=\'none\'">CLOSE</button>';
    }
    document.getElementById('productModal').style.display = 'flex';
}

document.addEventListener('click', function(e) {
    if (e.target.id === 'productModal') {
        document.getElementById('productModal').style.display = 'none';
    }
});
