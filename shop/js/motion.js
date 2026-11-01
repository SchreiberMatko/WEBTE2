// Motion that explains what changed: the chosen day, the shown menu and the menu refresh.
// Everything works and is visible without this script; it only adds the transitions.
// Moving between Menu and O projekte: js/navigation.js and the view transitions in styles.css.
// Listeners sit on the document, so they keep working after Swup swaps the page content;
// setupMenuMotion() sets up what belongs to one copy of the page.

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const wideScreen = window.matchMedia("(min-width: 801px)");
const rootStyle = getComputedStyle(document.documentElement);
const motionEaseOut = rootStyle.getPropertyValue("--ease-out").trim();
const motionEaseExit = rootStyle.getPropertyValue("--ease-exit").trim();
// Headings can move in a view transition only where the browser knows view-transition-class
const headingTransitions = "startViewTransition" in document && CSS.supports("view-transition-class", "restaurant");

let menuChange = 0;
let filterChange = 0;
let filterTransition = null;
let shownFilter = null;
let filterInTransition = false;
let refreshWatch = null;
let loaderShownAt = 0;
let loaderHide = null;
let loadingTimeout = null;
const loaderMinimum = 700;

// The whole menu settles in from slightly below when it changed in place (filter, refresh)
function showMenu(){
    const board = document.querySelector(".board");
    if (!board) return;
    syncBackgroundNow();
    board.getAnimations().forEach(animation => animation.cancel());

    if (prefersReducedMotion.matches){
        board.animate({ opacity: [0, 1] }, { duration: 150, easing: "ease" });
        return;
    }
    board.animate({ opacity: [0, 1], transform: ["translateY(8px)", "none"] }, { duration: 280, easing: motionEaseOut });
}

// What changes with the day: the row groups of the day on screen (all five days and their
// title rows in the week view, data-day on .board), not the row of restaurants above them
function dayParts(){
    const board = document.querySelector(".board");
    if (!board) return [];
    return [...board.querySelectorAll("tbody")]
        .filter(group => board.dataset.day === "week" || group.dataset.day === board.dataset.day);
}

// The dishes of the new day slide in from its side (direction 1 = later day, -1 = earlier)
function showDayParts(direction){
    syncBackgroundNow();
    const parts = dayParts();
    parts.forEach(part => part.getAnimations().forEach(animation => animation.cancel()));

    if (prefersReducedMotion.matches){
        parts.forEach(part => part.animate({ opacity: [0, 1] }, { duration: 150, easing: "ease" }));
        return;
    }
    parts.forEach(part => part.animate(
        { opacity: [0, 1], transform: ["translateX(" + direction * 16 + "px)", "none"] },
        { duration: 280, easing: motionEaseOut }
    ));
}

// Swaps the dishes for another day: the old ones fade out quickly, render() shows the new day,
// then its dishes slide in. Quick clicks in a row only finish the last change.
async function changeDay(render, direction){
    const change = ++menuChange;

    if (!prefersReducedMotion.matches){
        await Promise.all(dayParts().map(part => {
            const opacity = getComputedStyle(part).opacity;
            part.getAnimations().forEach(animation => animation.cancel());
            return part.animate({ opacity: [opacity, 0] }, { duration: 120, easing: motionEaseExit, fill: "forwards" })
                .finished.catch(() => {});
        }));
    }
    if (change !== menuChange) return;

    await render();
    if (change === menuChange) showDayParts(direction);
}

// Days: the tab is chosen at once, its day (data-day: 0-4 or "week") is shown on .board
// while the old dishes are faded out
document.addEventListener("click", e => {
    const day = e.target.closest(".day");
    if (!day || day.getAttribute("aria-pressed") === "true") return;

    const buttons = [...day.closest(".days").querySelectorAll(".day")];
    const current = buttons.find(button => button.getAttribute("aria-pressed") === "true");
    const index = buttons.indexOf(day);
    const direction = Math.sign(index - buttons.indexOf(current));

    // The old marker shrinks towards the new day, the new one grows from the old one's side
    if (current){
        current.style.setProperty("--marker-from", direction > 0 ? "right" : "left");
        current.setAttribute("aria-pressed", "false");
    }
    day.style.setProperty("--marker-from", direction > 0 ? "left" : "right");
    day.setAttribute("aria-pressed", "true");

    changeDay(() => {
        const board = document.querySelector(".board");
        if (board) board.dataset.day = day.dataset.day;
    }, direction);
});

// Restaurant filter on wide screens: a view transition (styles.css) moves the headings, so a
// column that stays slides to its new place instead of vanishing and coming back. The click is
// held back, the old layout is photographed first and the transition then makes the choice.
function filterWithTransition(input){
    const change = ++filterChange;
    const board = document.querySelector(".board");
    const headings = [...board.querySelectorAll(".menu-table__restaurant")];

    // A heading's "Lokálna kópia" label moves on its own, so it slides along the line with it
    const tags = headings.map(heading => [heading.querySelector(".tag"), heading.dataset.restaurant]).filter(([tag]) => tag);

    headings.forEach(heading => {
        heading.style.setProperty("view-transition-name", "restaurant-" + heading.dataset.restaurant);
        heading.style.setProperty("view-transition-class", "restaurant");
    });
    tags.forEach(([tag, restaurant]) => {
        tag.style.setProperty("view-transition-name", "tag-" + restaurant);
        tag.style.setProperty("view-transition-class", "restaurant-tag");
    });
    board.style.setProperty("view-transition-name", "menu-board");
    document.documentElement.classList.add("is-filtering");

    const transition = filterTransition = document.startViewTransition(() => {
        // Measured here, where the old choice is back; during the click the new one is already checked
        const widthsBefore = new Map(headings.map(heading => [heading, heading.getBoundingClientRect().width]));
        filterInTransition = true;
        input.checked = true;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        filterInTransition = false;

        // A heading that stays shows only its wider picture (styles.css), so tell which one it is
        headings.forEach(heading => {
            const before = widthsBefore.get(heading);
            const after = heading.getBoundingClientRect().width;
            if (!before || !after) return;
            heading.style.setProperty("view-transition-class", "restaurant " + (after >= before ? "grows" : "shrinks"));
        });
    });
    // A quicker next click takes over the names; only the last transition removes them
    transition.finished.finally(() => {
        if (change !== filterChange) return;
        filterTransition = null;
        [...headings, ...tags.map(([tag]) => tag)].forEach(element => {
            element.style.removeProperty("view-transition-name");
            element.style.removeProperty("view-transition-class");
        });
        board.style.removeProperty("view-transition-name");
        document.documentElement.classList.remove("is-filtering");
    });
}

document.addEventListener("click", e => {
    const input = e.target.closest(".segmented__input");
    if (!input || input.value === shownFilter) return;
    if (!headingTransitions || !wideScreen.matches || prefersReducedMotion.matches) return;

    e.preventDefault();
    filterWithTransition(input);
});

// While a view transition runs, the browser sends every click to <html>. A quick next click
// during the heading move ends that move and goes on to whatever is under the pointer.
document.addEventListener("click", async e => {
    if (e.target !== document.documentElement || !filterTransition) return;
    filterTransition.skipTransition();
    await filterTransition.finished.catch(() => {});
    document.elementFromPoint(e.clientX, e.clientY)?.click();
});

// Narrow screens, reduced motion and other browsers: CSS already swapped the columns,
// the menu only settles in again
document.addEventListener("change", e => {
    if (!e.target.matches(".segmented__input")) return;
    shownFilter = e.target.value;
    if (!filterInTransition) showMenu();
});

// Refresh: the menu gives its place to the big logo with the turning mill (styles.css) at once,
// and the logo stays a moment at least, so a quick load does not only flicker.
// script.js writes the new time into #LastRefresh when it is done; that ends the loading.
function startLoading(){
    const loader = document.querySelector(".loader");
    if (!loader) return;
    clearTimeout(loaderHide);
    if (loader.hidden){
        loader.hidden = false;
        loaderShownAt = performance.now();
        if (!prefersReducedMotion.matches) loader.animate({ opacity: [0, 1] }, { duration: 200, easing: motionEaseOut });
    }
    // Never keeps loading if the new time does not come
    clearTimeout(loadingTimeout);
    loadingTimeout = setTimeout(() => stopLoading(showMenu), 30000);
}

// Hides the logo once it has been there long enough, then done() brings the menu back
function stopLoading(done){
    clearTimeout(loadingTimeout);
    const loader = document.querySelector(".loader");
    if (!loader || loader.hidden){
        done?.();
        return;
    }
    clearTimeout(loaderHide);
    loaderHide = setTimeout(() => {
        loader.hidden = true;
        done?.();
    }, Math.max(0, loaderMinimum - (performance.now() - loaderShownAt)));
}

document.addEventListener("click", e => {
    if (e.target.closest(".update .button")) startLoading();
});

// Background drift (styles.css): every surface that shows the background runs its own copy, and
// one added later (a new menu table, the opened dialog) would start from the beginning. Every copy
// is set to start with the page, so they all show the same moment and the surfaces stay swapped.
function syncBackground(animations){
    animations
        .filter(animation => animation.animationName?.startsWith("glow-"))
        .forEach(animation => animation.startTime = 0);
}

document.addEventListener("animationstart", e => {
    if (e.animationName.startsWith("glow-")) syncBackground(e.target.getAnimations({ subtree: true }));
});

// "animationstart" only comes a frame or two after a surface appears, so the dishes of another
// day (hidden days do not drift) would first show the drift from its beginning and then jump.
// Where the menu is shown (showMenu, showDayParts) the copies are set before that first frame:
// getAnimations() brings the style up to date, so the new copies exist already.
function syncBackgroundNow(){
    syncBackground(document.getAnimations());
}

// The copies that started before this script ran
syncBackgroundNow();

// One copy of the page (the first load and every page Swup swaps in): the filter it shows and
// the time to watch. The new time rises into place, the menu settles in when the logo has gone.
function setupMenuMotion(){
    shownFilter = document.querySelector(".segmented__input:checked")?.value ?? null;
    refreshWatch?.disconnect();
    refreshWatch = null;

    const time = document.querySelector("#LastRefresh");
    if (!time) return;
    refreshWatch = new MutationObserver(() => {
        time.animate(
            prefersReducedMotion.matches ? { opacity: [0, 1] } : { opacity: [0, 1], transform: ["translateY(0.5em)", "none"] },
            { duration: prefersReducedMotion.matches ? 150 : 320, easing: motionEaseOut }
        );
        stopLoading(showMenu);
    });
    refreshWatch.observe(time, { childList: true, characterData: true, subtree: true });
}

setupMenuMotion();
