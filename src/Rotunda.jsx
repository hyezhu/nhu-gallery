import { useEffect, useRef, useState } from "react";
import { paintings, metaLine, N, STEP, RADIUS, CENTER_PULL, panelWidth, mod, isFacing } from "./data.js";
import DetailView from "./DetailView.jsx";

const pad = (n) => (n < 10 ? "0" + n : "" + n);

function circularDist(a, b) {
  const d = Math.abs(a - b) % N;
  return Math.min(d, N - d);
}

const RING_PANEL_WIDTH = 300; // uniform frame size on the ring so spacing reads even and symmetric

export default function Rotunda() {
  const [current, setCurrent] = useState(0); // unbounded step counter
  const [detailIdx, setDetailIdx] = useState(null); // null = rotunda view
  const [hideBox, setHideBox] = useState(null); // canvas-box hidden while its clone is out
  const [hoveredIdx, setHoveredIdx] = useState(null); // painting under the cursor
  const sectionRef = useRef(null);
  const boxRefs = useRef({});
  const detailOpen = detailIdx !== null;

  const activeIdx = mod(current);

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
    const onTouchStart = (e) => { touchX = e.touches[0].clientX; };
    const onTouchEnd = (e) => {
      if (touchX === null || detailOpen) return;
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 48) step(dx < 0 ? 1 : -1);
      touchX = null;
    };
    let wheelAcc = 0, wheelLockUntil = 0;
    const onWheel = (e) => {
      if (detailOpen) return;
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // vertical scroll passes through
      e.preventDefault(); // keep the browser's back/forward swipe gesture from firing
      const now = performance.now();
      if (now < wheelLockUntil) return; // swallow trackpad inertia mid-rotation
      wheelAcc += e.deltaX;
      if (Math.abs(wheelAcc) > 90) {
        step(wheelAcc > 0 ? 1 : -1);
        wheelAcc = 0;
        wheelLockUntil = now + 700;
      }
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("wheel", onWheel);
    };
  }, [detailOpen]);

  return (
    <section id="work" className="rotunda" ref={sectionRef}>
      <div className="rotunda-floor" />
      {/* While the detail view is open the room is frozen (no-anim): it can
          snap underneath the veil, so measurements are always settled */}
      <div className={"rotunda-stage" + (detailOpen ? " no-anim" : "")}>
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
            // even and symmetric regardless of each canvas's own aspect ratio
            const width = isActive ? panelWidth(p) : RING_PANEL_WIDTH;
            const z = isActive ? -(RADIUS - CENTER_PULL) : -RADIUS;
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
                <div className="fixture" />
                <div className="cone" />
                <div className="glow" />
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

      <button className="walk-arrow arrow-prev" aria-label="Previous painting" onClick={() => step(-1)}>
        <svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg>
      </button>
      <button className="walk-arrow arrow-next" aria-label="Next painting" onClick={() => step(1)}>
        <svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
      </button>

      <div className="walk-hint">Use the arrows to walk the room</div>
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
