// Clearing the saved data (the button in the footer): a dialog asks first, then the saved menus
// and the time of the last update are removed from localStorage and the footer says so.
// The button and the dialog are part of the page content Swup swaps, so the listeners sit on
// the document.

let clearedNote = null;
let clearedNoteFade = null;

function clearSavedData(){
    webs.forEach(web => localStorage.removeItem("Menu" + web.id));
    localStorage.removeItem("LastRefresh");

    const time = document.querySelector("#LastRefresh");
    if (time){
        time.removeAttribute("datetime");
        time.textContent = "—";
    }
    if (typeof showMenus === "function") showMenus();

    const status = document.querySelector(".site-footer__status");
    if (!status) return;
    // The note rises in and fades out before it goes, instead of popping in and vanishing
    // (curves from js/motion.js; with reduced motion it only fades)
    clearTimeout(clearedNote);
    clearedNoteFade?.cancel();
    status.textContent = "Uložené dáta sú vymazané.";
    status.animate(
        prefersReducedMotion.matches ? { opacity: [0, 1] } : { opacity: [0, 1], transform: ["translateY(0.25rem)", "none"] },
        { duration: prefersReducedMotion.matches ? 150 : 240, easing: motionEaseOut }
    );
    clearedNote = setTimeout(() => {
        clearedNoteFade = status.animate({ opacity: [1, 0] }, { duration: 120, easing: motionEaseExit, fill: "forwards" });
        clearedNoteFade.finished.then(() => {
            status.textContent = "";
            clearedNoteFade.cancel();
        }).catch(() => {});
    }, 6000);
    showMenus();
}

document.addEventListener("click", e => {
    if (!e.target.closest(".site-footer__clear")) return;
    const dialog = document.querySelector("#clear-dialog");
    // Esc keeps the last returnValue, so it starts empty every time
    dialog.returnValue = "";
    dialog.showModal();
});

// "close" does not bubble, so it is caught on the way down
document.addEventListener("close", e => {
    if (e.target.id === "clear-dialog" && e.target.returnValue === "clear") clearSavedData();
}, true);
