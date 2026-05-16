// ============================================
// POPUP PENGESAHAN SEBELUM BELI PRODUK (U2A) - CUSTOM HITAM-EMAS
// ============================================

window.confirmAndBuy = function(key, amount) {
    var productName = (key === 'echelon') ? 'THE ECHELON BRIEFING PACK' : 'THE COMMAND CENTER SUITE';
    var message = "Are you sure you want to purchase " + productName + " for " + amount + " Pi?\n\nThis is a Testnet transaction. No real Pi will be deducted.";
    
    // Buang popup lama jika ada
    var existingPopup = document.getElementById('customConfirmPopup');
    if (existingPopup) existingPopup.remove();
    
    // Buat modal custom
    var modal = document.createElement('div');
    modal.id = 'customConfirmPopup';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.95)';
    modal.style.zIndex = '1000';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    
    modal.innerHTML = `
        <div style="background:#0d0d0d; border:2px solid #FFD700; padding:25px; max-width:320px; width:90%; text-align:center; border-radius:8px;">
            <h3 style="color:#FFD700; margin-bottom:15px;">⚠️ Confirm Purchase</h3>
            <p style="color:#ddd; margin-bottom:20px; line-height:1.5;">${message.replace(/\n/g, '<br>')}</p>
            <div style="display:flex; gap:10px; justify-content:center;">
                <button id="confirmOkBtn" style="background:#FFD700; color:#000; border:none; padding:10px 20px; font-weight:bold; border-radius:4px; cursor:pointer;">✅ OK</button>
                <button id="confirmCancelBtn" style="background:transparent; color:#aaa; border:1px solid #aaa; padding:10px 20px; font-weight:bold; border-radius:4px; cursor:pointer;">❌ Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event untuk butang OK
    document.getElementById('confirmOkBtn').addEventListener('click', function() {
        modal.remove();
        buyProduct(key, amount);
    });
    
    // Event untuk butang Cancel
    document.getElementById('confirmCancelBtn').addEventListener('click', function() {
        modal.remove();
    });
    
    // Tutup jika klik luar popup
    modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
    });
};

// ============================================
// POPUP WARNING (SEBELUM A2U)
// ============================================

function insertWarningPopup() {
    var payoutContainer = document.getElementById('payout-content');
    if (!payoutContainer) return;
    if (document.getElementById('warningPopup')) return;

    var originalCard = payoutContainer.querySelector('.product-card');
    if (!originalCard) return;

    originalCard.style.opacity = '0.5';
    originalCard.style.pointerEvents = 'none';
    originalCard.style.transition = '0.2s';

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

    payoutContainer.insertBefore(popupDiv, originalCard);

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
        });
    }

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

    var originalSwitchLanguage = window.switchLanguage;
    if (typeof originalSwitchLanguage === 'function') {
        window.switchLanguage = function(lang) {
            originalSwitchLanguage(lang);
            updatePopupLanguage();
        };
    }

    updatePopupLanguage();
}

// ============================================
// POPUP SUCCESS (SELEPAS A2U BERJAYA)
// ============================================

function showSuccessPopup(title, message, buttonText) {
    // Buang popup lama jika ada
    var existingPopup = document.getElementById('customSuccessPopup');
    if (existingPopup) existingPopup.remove();

    var modal = document.createElement('div');
    modal.id = 'customSuccessPopup';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.95)';
    modal.style.zIndex = '1000';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';

    modal.innerHTML = `
        <div style="background:#0d0d0d; border:2px solid #FFD700; padding:25px; max-width:320px; width:90%; text-align:center; border-radius:8px;">
            <h3 style="color:#FFD700; margin-bottom:15px;">${title}</h3>
            <p style="color:#ddd; margin-bottom:20px; line-height:1.5;">${message}</p>
            <button onclick="this.closest('#customSuccessPopup').remove()" style="background:#FFD700; color:#000; border:none; padding:10px 20px; font-weight:bold; border-radius:4px; cursor:pointer;">${buttonText}</button>
        </div>
    `;

    document.body.appendChild(modal);

    // Tutup jika klik luar popup
    modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
    });
}

// ============================================
// INIT
// ============================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', insertWarningPopup);
} else {
    insertWarningPopup();
            }
