// Fungsi untuk sisipkan popup ke dalam page
function insertWarningPopup() {
    // Cari container PIONEER REWARD
    var payoutContainer = document.getElementById('payout-content');
    if (!payoutContainer) return;

    // Cek sama ada popup sudah wujud (elak duplicate)
    if (document.getElementById('warningPopup')) return;

    // HTML untuk popup + modified card
    var popupHTML = `
        <div id="warningPopup" style="background:rgba(255,215,0,0.1); border-left:4px solid #FFD700; padding:12px 16px; margin-bottom:20px; border-radius:4px; text-align:left;">
            <p id="warningTitle" style="color:#FFD700; margin:0 0 6px 0; font-weight:bold;">⚠️ Before You Claim:</p>
            <p id="warningText1" style="color:#ddd; margin:0 0 8px 0; font-size:0.85rem;">When you tap the button below, <strong>Pi Browser will ask you to unlock your wallet</strong> (passphrase or biometric).</p>
            <p id="warningText2" style="color:#ddd; margin:0; font-size:0.85rem;">✅ This is <strong>NORMAL</strong> for any transaction.<br>✅ The popup comes from <strong>Pi Browser</strong>, NOT from our app.<br>✅ Our app will NEVER see your passphrase.</p>
            <button id="understoodBtn" style="margin-top:10px; background:#FFD700; color:#000; border:none; padding:5px 14px; border-radius:20px; font-size:0.75rem; cursor:pointer; font-weight:bold;">✅ I Understand & Continue</button>
            <button id="cancelBtn" style="margin-top:10px; margin-left:8px; background:transparent; color:#aaa; border:1px solid #aaa; padding:5px 14px; border-radius:20px; font-size:0.75rem; cursor:pointer;">❌ Cancel</button>
        </div>
    `;

    // Simpan HTML asal product card
    var originalCard = payoutContainer.querySelector('.product-card');
    var originalCardHTML = originalCard.outerHTML;

    // Kosongkan container
    payoutContainer.innerHTML = popupHTML;

    // Tambah semula card (dengan disabled state)
    var cardContainer = document.createElement('div');
    cardContainer.innerHTML = originalCardHTML;
    var newCard = cardContainer.firstChild;
    newCard.style.opacity = '0.5';
    newCard.style.pointerEvents = 'none';
    newCard.id = 'payoutCard';
    payoutContainer.appendChild(newCard);

    // Popup logic
    var understoodBtn = document.getElementById('understoodBtn');
    var cancelBtn = document.getElementById('cancelBtn');
    var warningPopup = document.getElementById('warningPopup');
    var payoutCard = document.getElementById('payoutCard');

    if (understoodBtn) {
        understoodBtn.addEventListener('click', function() {
            warningPopup.style.display = 'none';
            payoutCard.style.opacity = '1';
            payoutCard.style.pointerEvents = 'auto';
        });
    }
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            warningPopup.style.display = 'none';
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
