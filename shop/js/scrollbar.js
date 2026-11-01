// Custom scrollbar: lies over the page (takes no width, so nothing shifts left).
// It shows for a moment whenever the page scrolls, on touch screens too, and stays
// while the mouse is near the right edge of the window, where it can be dragged.
// Without this script the page keeps the normal browser scrollbar.

const scrollbar = document.querySelector(".scrollbar");
const scrollThumb = scrollbar.querySelector(".scrollbar__thumb");
const nearDistance = 64;
const flashDuration = 1000;
let dragOffset = null;
let flashTimer = null;

function updateScrollbar(){
    const pageHeight = document.documentElement.scrollHeight;
    const scrollable = pageHeight - window.innerHeight;
    scrollbar.classList.toggle("is-disabled", scrollable <= 0);
    if (scrollable <= 0) return;

    const track = scrollbar.clientHeight;
    const size = Math.max(48, track * window.innerHeight / pageHeight);
    const progress = Math.min(Math.max(window.scrollY / scrollable, 0), 1);
    scrollThumb.style.height = size + "px";
    scrollThumb.style.transform = "translateY(" + progress * (track - size) + "px)";
}

function setNear(near){
    scrollbar.classList.toggle("is-near", near || dragOffset !== null);
}

// Shows the scrollbar so it is clear the page is moving;
// it hides once the page has stood still for a while
function flashScrollbar(){
    scrollbar.classList.add("is-flashing");
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => scrollbar.classList.remove("is-flashing"), flashDuration);
}

function onScroll(){
    updateScrollbar();
    flashScrollbar();
}

// offset = where on the thumb the pointer holds it
function scrollToTrack(clientY, offset, behavior){
    const track = scrollbar.getBoundingClientRect();
    const progress = (clientY - offset - track.top) / (track.height - scrollThumb.offsetHeight);
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: Math.min(Math.max(progress, 0), 1) * scrollable, behavior: behavior });
}

function endDrag(e){
    dragOffset = null;
    scrollbar.classList.remove("is-dragging");
    setNear(e.clientX >= window.innerWidth - nearDistance);
}

// The browser scrollbar is hidden everywhere, so touch screens don't show two of them
document.documentElement.classList.add("has-custom-scrollbar");

// Near the edge and dragging only work with a mouse
if (window.matchMedia("(hover: hover) and (pointer: fine)").matches){
    document.addEventListener("mousemove", e => setNear(e.clientX >= window.innerWidth - nearDistance));
    document.addEventListener("mouseout", e => {
        if (!e.relatedTarget) setNear(false);
    });

    scrollThumb.addEventListener("pointerdown", e => {
        e.preventDefault();
        dragOffset = e.clientY - scrollThumb.getBoundingClientRect().top;
        scrollThumb.setPointerCapture(e.pointerId);
        scrollbar.classList.add("is-dragging");
    });
    scrollThumb.addEventListener("pointermove", e => {
        if (dragOffset !== null) scrollToTrack(e.clientY, dragOffset, "instant");
    });
    scrollThumb.addEventListener("pointerup", endDrag);
    scrollThumb.addEventListener("pointercancel", endDrag);

    // Click on the empty track: glide there with the thumb centred on the click
    scrollbar.addEventListener("pointerdown", e => {
        if (e.target === scrollbar) scrollToTrack(e.clientY, scrollThumb.offsetHeight / 2, "smooth");
    });
}

// Every scroll moves the thumb and shows the scrollbar for a moment, on every device
window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", updateScrollbar);
// script.js builds the menu later, so the page height is watched too
new ResizeObserver(updateScrollbar).observe(document.body);
updateScrollbar();
