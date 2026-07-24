import { useEffect, useRef, useState } from "react";
import { paintings, metaLine, N, STEP, RADIUS, CENTER_PULL, panelWidth, mod, isFacing } from "./data.js";
import DetailView from "./DetailView.jsx";

const pad = (n) => (n < 10 ? "0" + n : "" + n);

function circularDist(a, b) {
  const d = Math.abs(a - b) % N;
  return Math.min(d, N - d);
}

const RING_PANEL_WIDTH = 300; // uniform frame size on the ring so spacing reads even and symmetric

// The room's geometry (radius, panel widths) was tuned by eye at a desktop
// viewport around 1400px. Below that (but still above the mobile breakpoint,
// e.g. tablets), shrink everything by the same factor so the ring and its
// gaps stay proportional instead of spilling off a narrower screen.
const REF_VIEWPORT = 1400;
const MIN_SCALE = 0.46;

function useRoomScale() {
  const [vw, setVw] = useState(() => (typeof window !== "undefined" ? window.innerWidth : REF_VIEWPORT));
  useEffect(() => {
    let raf = null;
    const onResize = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        setVw(window.innerWidth);
      });
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return Math.min(1, Math.max(MIN_SCALE, vw / REF_VIEWPORT));
}

// Touch is the primary way to turn the room on a phone, so the hint should
// say so instead of pointing at arrows a thumb has to reach for.
function useCoarsePointer() {
  const [coarse, setCoarse] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const onChange = () => setCoarse(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return coarse;
}

// Below this width the 3D ring (14 panels sliding around a rotating
// cylinder) is dropped in favor of a flat 3-up strip — same breakpoint the
// rest of the mobile chrome already switches on. Small screens don't have
// room to make a rotating ring read as a ring, so the animated slide just
// looked like the wrong painting sliding in, and the perspective made
// everything tiny to fit the whole circle in frame.
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width:720px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width:720px)");
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}

export default function Rotunda() {
  const [current, setCurrent] = useState(0); // unbounded step counter
  const [detailIdx, setDetailIdx] = useState(null); // null = rotunda view
  const [hideBox, setHideBox] = useState(null); // canvas-box hidden while its clone is out
  const [hoveredIdx, setHoveredIdx] = useState(null); // painting under the cursor
  const sectionRef = useRef(null);
  const boxRefs = useRef({});
  const detailOpen = detailIdx !== null;
  const scale = useRoomScale();
  const coarsePointer = useCoarsePointer();
  const isMobile = useIsMobile();

  const activeIdx = mod(current);
  const radius = RADIUS * scale;
  const centerPull = CENTER_PULL * scale;
  const ringPanelWidth = RING_PANEL_WIDTH * scale;

  function step(dir) {
    if (detailOpen) return;
    setCurrent((c) => c + dir);
  }

  // Shortest-path rotation to painting j (used while switching in zoom)
  function rotateTo(j) {
    setCurrent((c) => {
      let diff = (mod(j) - mod(c) + N) % N;
      if (diff > N / 2) diff -= N;
      return c + diff;
    });
  }

  // Hovering highlights a painting and makes it selectable — but only if it's
  // currently facing the viewer (turned more than 90 deg away = not selectable).
  // Clicking it opens the zoom view directly from wherever it hangs; the ring
  // itself never rotates on click, only via the arrows/swipe/keys.
  function openDetail(i) {
    if (detailOpen || !isFacing(i, current)) return;
    setDetailIdx(i);
    setHideBox(i);
    setHoveredIdx(null);
  }

  function navigateDetail(j) {
    const t = mod(j);
    if (t === detailIdx) return;
    rotateTo(t); // room is frozen (no-anim) while detail is open, so it snaps
    setDetailIdx(t);
    setHideBox(t);
  }

  function handleDetailClose(evt) {
    if (evt.reveal === "before") setHideBox(null); // rehang the painting
    if (evt.done) setDetailIdx(null);
  }

  // Keyboard navigation for the room (only when the rotunda is in view)
  useEffect(() => {
    function onKey(e) {
      if (detailOpen) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const inView = rect.top < window.innerHeight * 0.5 && rect.bottom > window.innerHeight * 0.5;
      if (!inView) return;
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [detailOpen]);

  // Touch swipe + trackpad two-finger swipe
  useEffect(() => {
    const el = sectionRef.current;
    let touchX = null;
    let touchY = null;
    const onTouchStart = (e) => {
      touchX = e.touches[0].clientX;
      touchY = e.touches[0].clientY;
    };
    const onTouchEnd = (e) => {
      if (touchX === null || detailOpen) return;
      const dx = e.changedTouches[0].clientX - touchX;
      const dy = e.changedTouches[0].clientY - touchY;
      // Only treat it as a room turn if the gesture was more horizontal than
      // vertical — otherwise a scroll-the-page swipe would spin the ring too.
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
      touchX = null;
      touchY = null;
    };
    let wheelAcc = 0;
    let gestureStepped = false; // this swipe (including its momentum tail) already turned the room once
    let gestureEndTimer = null;
    const onWheel = (e) => {
      if (detailOpen) return;
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // vertical scroll passes through
      e.preventDefault(); // keep the browser's back/forward swipe gesture from firing
      // A trackpad flick keeps sending decaying "momentum" wheel events for
      // well over a second after the finger lifts — longer than any fixed
      // lockout window. Gate on a real pause in events instead of a timer,
      // so one swipe's momentum tail can never re-cross the threshold and
      // sneak in a second, unintended step. The pause needs to be generous:
      // real momentum events don't arrive on a perfectly even clock, and a
      // gap that's too short (150ms) reads as "gesture over" mid-momentum,
      // which re-arms the threshold early and made rotation glitch — extra
      // jumps mid-swipe, or a follow-up swipe swallowed as if it were still
      // the previous one. Touching the trackpad again always kills any
      // in-flight momentum first, so a real new gesture is never this close
      // on the heels of the last one — 400ms is safely inside that gap.
      clearTimeout(gestureEndTimer);
      gestureEndTimer = setTimeout(() => {
        wheelAcc = 0;
        gestureStepped = false;
      }, 400);
      if (gestureStepped) return;
      wheelAcc += e.deltaX;
      if (Math.abs(wheelAcc) > 90) {
        step(wheelAcc > 0 ? 1 : -1);
        gestureStepped = true;
      }
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("wheel", onWheel);
      clearTimeout(gestureEndTimer);
    };
  }, [detailOpen]);

  return (
    <section id="work" className="rotunda" ref={sectionRef}>
      <div className="rotunda-floor" />
      {isMobile ? (
        // Flat 3-up strip: previous/next just peek at the edges (tap to bring
        // one to center), the center one is large and is the only one that
        // opens the zoom view. Swapping which painting fills each slot is an
        // instant cut, not a slide — nothing moves across the screen.
        <div className="mobile-room">
          {[-1, 0, 1].map((offset) => {
            const i = mod(activeIdx + offset);
            const p = paintings[i];
            const isActive = offset === 0;
            return (
              <div
                key={i}
                className={"mobile-panel" + (isActive ? " active" : " side")}
                onClick={() => (isActive ? openDetail(i) : step(offset))}
              >
                <div
                  className="canvas-box"
                  ref={isActive ? (el) => (boxRefs.current[i] = el) : undefined}
                  style={hideBox === i ? { visibility: "hidden" } : undefined}
                >
                  <div className="art" style={{ "--ar": p.ar, backgroundImage: p.bg }} />
                </div>
                {isActive && (
                  <div className="placard">
                    <div className="title">{p.title}</div>
                    <div className="meta">{metaLine(p)}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* While the detail view is open the room is frozen (no-anim): it can
           snap underneath the veil, so measurements are always settled */
        <div
          className={"rotunda-stage" + (detailOpen ? " no-anim" : "")}
          style={{ "--rotunda-scale": scale }}
        >
          <div className="ring" style={{ transform: `rotateY(${-current * STEP}deg)` }}>
            {paintings.map((p, i) => {
              const d = circularDist(i, activeIdx);
              const isActive = d === 0;
              const facing = isFacing(i, current);
              const cls = [
                "panel",
                isActive ? "active" : facing ? "facing" : "dim",
                !isActive && facing && hoveredIdx === i ? "hovered" : ""
              ].filter(Boolean).join(" ");
              // The highlighted painting steps off the wall and stands in the
              // center of the room, at its true proportions; every other frame
              // on the ring shares one width so the gaps between them read as
              // even and symmetric regardless of each canvas's own aspect ratio.
              // Both are scaled together so the room shrinks as one piece on
              // narrow screens instead of the active painting staying huge.
              const width = isActive ? panelWidth(p) * scale : ringPanelWidth;
              const z = isActive ? -(radius - centerPull) : -radius;
              return (
                <div
                  key={i}
                  className={cls}
                  style={{
                    width,
                    transform: `rotateY(${i * STEP}deg) translateZ(${z}px) translate(-50%, -50%)`
                  }}
                  onClick={() => openDetail(i)}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx((h) => (h === i ? null : h))}
                >
                  <div
                    className="canvas-box"
                    ref={(el) => (boxRefs.current[i] = el)}
                    style={hideBox === i ? { visibility: "hidden" } : undefined}
                  >
                    <div className="art" style={{ "--ar": p.ar, backgroundImage: p.bg }} />
                  </div>
                  <div className="placard">
                    <div className="title">{p.title}</div>
                    <div className="meta">{metaLine(p)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button className="walk-arrow arrow-prev" aria-label="Previous painting" onClick={() => step(-1)}>
        <svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg>
      </button>
      <button className="walk-arrow arrow-next" aria-label="Next painting" onClick={() => step(1)}>
        <svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
      </button>

      <div className="walk-hint">
        {coarsePointer ? "Swipe to walk the room" : "Use the arrows to walk the room"}
      </div>
      <div className="room-hud">
        <div className="count">{pad(activeIdx + 1)} / {pad(N)}</div>
        <div className="name">{paintings[activeIdx].title}</div>
      </div>

      {detailOpen && (
        <DetailView
          idx={detailIdx}
          getBoxRect={(i) => boxRefs.current[i].getBoundingClientRect()}
          onNavigate={navigateDetail}
          onClose={handleDetailClose}
        />
      )}
    </section>
  );
}
