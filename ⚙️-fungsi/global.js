// global.js – Pembolehubah & fungsi kongsi
let currentUser = null;
let pendingIncompleteCount = 0;

function updateStatus(msg) {
    document.getElementById("stSticky").textContent = msg;
}

function tryEnablePaymentButtons() {
    const btn1 = document.getElementById("btn-pay1");
    const btn10 = document.getElementById("btn-pay10");
    if (currentUser && pendingIncompleteCount === 0) {
        if (btn1) btn1.disabled = false;
        if (btn10) btn10.disabled = false;
    }
}

function copySOP() {
    const sop = document.getElementById("sop-text").textContent;
    navigator.clipboard.writeText(sop).then(function(){
        updateStatus("📋 SOP disalin!");
    });
}
