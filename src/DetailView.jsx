import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { paintings, metaLine, mod } from "./data.js";

function detailRect(p) {
  // Centered target rect that fits the viewport, leaving room for the caption
  const [aw, ah] = p.ar.split("/").map(Number);
  const ratio = aw / ah;
  const maxW = window.innerWidth * 0.86;
  const maxH = window.innerHeight * 0.70;
  let tw = maxW, th = tw / ratio;
  if (th > maxH) { th = maxH; tw = th * ratio; }
  const tx = (window.innerWidth - tw) / 2;
  const ty = (window.innerHeight - th) / 2 - window.innerHeight * 0.03;
  return { tw, th, tx, ty };
}

/**
 * Zoomed-in view of one painting.
 * - Flies in from the painting's frame on the wall (FLIP).
 * - Left/right switches paintings without leaving the view; the room
 *   (frozen behind the veil while this is open) snaps along underneath.
 * - Close: if the user never switched, the painting flies back into its
 *   frame; if they did switch, a crossfade hands off to the real panel —
 *   the panel itself is the source of truth, so it can never land off-center.
 */
export default function DetailView({ idx, getBoxRect, onNavigate, onClose }) {
  const p = paintings[idx];
  const [rect, setRect] = useState(() => detailRect(p));
  const [flying, setFlying] = useState(false);
  const [shown, setShown] = useState(false);
  const [closing, setClosing] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const cloneRef = useRef(null);
  const switchedRef = useRef(false);
  const openedIdxRef = useRef(idx);
  const [transform, setTransform] = useState("");

  // Fly in from the frame on the wall (runs once, on mount)
  useLayoutEffect(() => {
    const src = getBoxRect(openedIdxRef.current);
    const { tw, tx, ty } = detailRect(paintings[openedIdxRef.current]);
    const scale = src.width / tw;
    setTransform(`translate(${src.left - tx}px, ${src.top - ty}px) scale(${scale})`);
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        setFlying(true);
        setShown(true);
        setTransform("translate(0, 0) scale(1)");
      });
      return () => cancelAnimationFrame(raf2);
    });
    return () => cancelAnimationFrame(raf1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switching paintings while zoomed: resize to the new work's proportions
  useLayoutEffect(() => {
    if (idx !== openedIdxRef.current) switchedRef.current = true;
    setRect(detailRect(p));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  function close() {
    if (closing) return;
    setClosing(true);
    setShown(false);
    if (switchedRef.current) {
      // Crossfade handoff to the real, centered panel
      onClose({ reveal: "before" });
      setFadeOut(true);
      setTimeout(() => onClose({ done: true }), 500);
    } else {
      // Fly back into the frame
      requestAnimationFrame(() => {
        const back = getBoxRect(idx);
        const { tw, tx, ty } = rect ? { tw: rect.tw, tx: rect.tx, ty: rect.ty } : detailRect(p);
        const backScale = back.width / tw;
        setTransform(`translate(${back.left - tx}px, ${back.top - ty}px) scale(${backScale})`);
      });
    }
  }

  function onTransitionEnd(e) {
    if (!closing || switchedRef.current) return;
    if (e.target !== cloneRef.current || e.propertyName !== "transform") return;
    onClose({ reveal: "before" });
    onClose({ done: true });
  }

  // Keyboard: Escape closes, arrows navigate
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") { e.preventDefault(); onNavigate(idx + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); onNavigate(idx - 1); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  return (
    <>
      <div
        className={"detail-backdrop" + (shown ? " show" : "")}
        onClick={close}
      />
      <div
        ref={cloneRef}
        className={"detail-clone" + (flying ? " flying" : "")}
        style={{
          left: rect.tx, top: rect.ty, width: rect.tw, height: rect.th,
          transform,
          ...(fadeOut ? { transition: "opacity .45s ease", opacity: 0 } : {})
        }}
        onClick={close}
        onTransitionEnd={onTransitionEnd}
      >
        <div className="art" style={{ backgroundImage: p.bg }} />
      </div>
      <button
        className={"detail-nav detail-prev" + (shown ? " show" : "")}
        aria-label="Previous painting"
        onClick={() => onNavigate(idx - 1)}
      >
        <svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg>
      </button>
      <button
        className={"detail-nav detail-next" + (shown ? " show" : "")}
        aria-label="Next painting"
        onClick={() => onNavigate(idx + 1)}
      >
        <svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
      </button>
      <div className={"detail-caption" + (shown ? " show" : "")}>
        <div className="title">{p.title}</div>
        <div className="meta">{metaLine(p)}</div>
        <button type="button" onClick={close}>Return to the room</button>
      </div>
    </>
  );
}
