// Showing only the live menus (the button in the footer): a restaurant whose saved menu came from
// its local copy (offline/) then shows as empty instead (showMenus in script.js); pressing it
// again shows the local copies too. The choice is kept in localStorage ("LiveOnly"), so it stays
// after a reload. The button is part of the page content Swup swaps, so the listener sits on the
// document and js/navigation.js sets the label again on every page it swaps in.

function showSourceButton(){
    const button = document.querySelector(".site-footer__source");
    if (!button) return;
    button.textContent = liveOnly() ? "Zobraziť lokálne kópie" : "Zobraziť len živé menu";
}

document.addEventListener("click", e => {
    if (!e.target.closest(".site-footer__source")) return;
    if (liveOnly()) localStorage.removeItem("LiveOnly");
    else localStorage.setItem("LiveOnly", "true");
    showSourceButton();
    showMenus();
});

showSourceButton();
