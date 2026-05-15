// Fungsi untuk sisipkan popup di atas PIONEER REWARD (tanpa memusnahkan elemen asal)
function insertWarningPopup() {
    // Cari container PIONEER REWARD
    var payoutContainer = document.getElementById('payout-content');
    if (!payoutContainer) return;

    // Cek sama ada popup sudah wujud (elak duplicate)
    if (document.getElementById('warningPopup')) return;

    // Simpan rujukan ke card asal
    var originalCard = payoutContainer.querySelector('.product-card');
    if (!originalCard) return;

    // Disable card asal (supaya pengguna kena akui dulu)
    originalCard.style.opacity = '0.5';
    originalCard.style.pointerEvents = 'none';
    originalCard.style.transition = '0.2s';

    // HTML untuk popup
    var popupDiv = document.createElement('div');
    popupDiv.id = 'warningPopup';
    popupDiv.style.background = 'rgba(255,215,0,0.1)';
    popupDiv.style.borderLeft = '4px solid #FFD700';
    popupDiv.style.padding = '12px 16px';
    popupDiv.style.marginBottom = '20px';
    popupDiv.style.borderRadius = '4px';
    popupDiv.style.textAlign = 'left';

    popupDiv.innerHTML = `
        <p id="warningTitle" style="color:#FFD700; margin:0 0 6px 0; font-weight:bold;">⚠️ Before You Claim:</p>
        <p id="warningText1" style="color:#ddd; margin:0 0 8px 0; font-size:0.85rem;">When you tap the button below, <strong>Pi Browser will ask you to unlock your wallet</strong> (passphrase or biometric).</p>
        <p id="warningText2" style="color:#ddd; margin:0; font-size:0.85rem;">✅ This is <strong>NORMAL</strong> for any transaction.<br>✅ The popup comes from <strong>Pi Browser</strong>, NOT from our app.<br>✅ Our app will NEVER see your passphrase.</p>
        <button id="understoodBtn" style="margin-top:10px; background:#FFD700; color:#000; border:none; padding:5px 14px; border-radius:20px; font-size:0.75rem; cursor:pointer; font-weight:bold;">✅ I Understand & Continue</button>
        <button id="cancelBtn" style="margin-top:10px; margin-left:8px; background:transparent; color:#aaa; border:1px solid #aaa; padding:5px 14px; border-radius:20px; font-size:0.75rem; cursor:pointer;">❌ Cancel</button>
    `;

    // Sisipkan popup di atas card asal
    payoutContainer.insertBefore(popupDiv, originalCard);

    // Popup logic
    var understoodBtn = document.getElementById('understoodBtn');
    var cancelBtn = document.getElementById('cancelBtn');
    var warningPopup = document.getElementById('warningPopup');

    if (understoodBtn) {
        understoodBtn.addEventListener('click', function() {
            warningPopup.style.display = 'none';
            originalCard.style.opacity = '1';
            originalCard.style.pointerEvents = 'auto';
        });
    }
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            warningPopup.style.display = 'none';
            // Card tetap disabled (tak boleh claim)
        });
    }

    // Popup 2 bahasa (EN/MS)
    function updatePopupLanguage() {
        var currentLang = localStorage.getItem('mb-legacy-lang') || 'en';
        var title = document.getElementById('warningTitle');
        var text1 = document.getElementById('warningText1');
        var text2 = document.getElementById('warningText2');
        var understoodBtnText = document.getElementById('understoodBtn');
        var cancelBtnText = document.getElementById('cancelBtn');
        if (!title) return;
        if (currentLang === 'ms') {
            title.innerHTML = '⚠️ Sebelum Anda Claim:';
            text1.innerHTML = 'Apabila anda tekan butang di bawah, <strong>Pi Browser akan meminta anda membuka kunci dompet</strong> (pasfras atau biometrik).';
            text2.innerHTML = '✅ Ini adalah <strong>PROSES NORMAL</strong> untuk sebarang transaksi.<br>✅ Popup itu <strong>DARI Pi Browser</strong>, BUKAN dari app kami.<br>✅ App kami TIDAK akan pernah melihat pasfras anda.';
            if (understoodBtnText) understoodBtnText.innerHTML = '✅ Saya Faham & Teruskan';
            if (cancelBtnText) cancelBtnText.innerHTML = '❌ Batal';
        } else {
            title.innerHTML = '⚠️ Before You Claim:';
            text1.innerHTML = 'When you tap the button below, <strong>Pi Browser will ask you to unlock your wallet</strong> (passphrase or biometric).';
            text2.innerHTML = '✅ This is <strong>NORMAL</strong> for any transaction.<br>✅ The popup comes from <strong>Pi Browser</strong>, NOT from our app.<br>✅ Our app will NEVER see your passphrase.';
            if (understoodBtnText) understoodBtnText.innerHTML = '✅ I Understand & Continue';
            if (cancelBtnText) cancelBtnText.innerHTML = '❌ Cancel';
        }
    }

    // Override switchLanguage (selaras dengan popup)
    var originalSwitchLanguage = window.switchLanguage;
    if (typeof originalSwitchLanguage === 'function') {
        window.switchLanguage = function(lang) {
            originalSwitchLanguage(lang);
            updatePopupLanguage();
        };
    }

    updatePopupLanguage();
}

// Jalankan popup selepas page siap
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', insertWarningPopup);
} else {
    insertWarningPopup();
}
