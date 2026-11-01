// Small screens: after choosing a restaurant or a day, the page scrolls so that the top border
// of the filter or of the day switcher sits at the top of the window and the menu fits below it.
// The scrollbar from js/scrollbar.js flashes first and the page starts slowly (ease-in),
// so the scrollbar has slid in before the page really gets moving, and it also slows down
// before it stops (ease-out).
// Listeners are on the document, so they keep working when the day buttons are built again.

const smallScreen = window.matchMedia("(max-width: 600px)");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const scrollDuration = 400;
let scrollFrame = null;

// Cubic ease-in for the first half, the mirrored ease-out for the second
function easeInOut(t){
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(2 - 2 * t, 3) / 2;
}

function stopScrolling(){
    cancelAnimationFrame(scrollFrame);
    scrollFrame = null;
}

function animateScroll(target){
    const start = window.scrollY;
    const startTime = performance.now();

    function step(now){
        const progress = Math.min((now - startTime) / scrollDuration, 1);
        window.scrollTo(0, start + (target - start) * easeInOut(progress));
        scrollFrame = progress < 1 ? requestAnimationFrame(step) : null;
    }
    scrollFrame = requestAnimationFrame(step);
}

function scrollToTop(section){
    if (!section || !smallScreen.matches) return;
    stopScrolling();

    // Where the page can actually get to: a short page stops at its bottom
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const target = Math.min(Math.max(window.scrollY + section.getBoundingClientRect().top, 0), scrollable);
    if (Math.abs(target - window.scrollY) < 1) return;

    flashScrollbar();
    if (reducedMotion.matches) window.scrollTo(0, target);
    else animateScroll(target);
}

document.addEventListener("change", e => {
    if (e.target.matches(".segmented__input")) scrollToTop(e.target.closest(".segmented"));
});

document.addEventListener("click", e => {
    const day = e.target.closest(".day");
    if (day) scrollToTop(day.closest(".days"));
});

// The user takes over the scrolling: wheel, touch, mouse or keys stop the animation
for (const type of ["wheel", "pointerdown", "keydown"]){
    window.addEventListener(type, stopScrolling, { passive: true });
}
