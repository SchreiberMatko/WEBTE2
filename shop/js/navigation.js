// Moving between Menu and O projekte without loading the whole page again (Swup): it fetches the
// other page, swaps the content of #swup and keeps the stylesheet and the scripts that already run.
// The move itself is the view transition in styles.css; the a11y plugin moves the focus to the new
// page and reads its heading out. Without JavaScript the links simply load the other page.
// Swup comes from jsDelivr (index.html); when it did not load (offline, CDN down) the links
// also just load the other page.

if (typeof Swup !== "undefined"){
    const swup = new Swup({
        native: true,
        // With view transitions there is nothing else to wait for; without them the content fades (styles.css)
        animationSelector: "startViewTransition" in document ? false : '[class*="transition-"]',
        plugins: typeof SwupA11yPlugin !== "undefined" ? [new SwupA11yPlugin({
            announcements: { visit: "Otvorená stránka: {title}", url: "Nová stránka {url}" }
        })] : []
    });

    // A freshly swapped page needs what the scripts set up on the first load
    swup.hooks.on("page:view", () => {
        showLastRefresh();
        showMenus();
        setupMenuMotion();
    });
}
