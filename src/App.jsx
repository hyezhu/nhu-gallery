import { useEffect, useState } from "react";
import { paintings, metaLine } from "./data.js";
import Rotunda from "./Rotunda.jsx";

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <nav className={scrolled ? "scrolled" : ""}>
      <a href="#" className="mark">Nhu <span style={{ opacity: 0.6 }}>— Paintings</span></a>
      <button className="nav-toggle" aria-label="Toggle menu" onClick={() => setOpen(!open)}>&#9776;</button>
      <div className={"nav-links" + (open ? " open" : "")} onClick={() => setOpen(false)}>
        <a href="#work">Work</a>
        <a href="#about">About</a>
        <a href="#contact">Contact</a>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="hero">
      <div className="hero-canvas" />
      <div className="hero-scrim" />
      <div className="hero-content">
        <div className="hero-eyebrow">Original works</div>
        <h1>Welcome to<br />my gallery.</h1>
        <p>Fourteen works hang in a circular room around you. Use the arrows to turn the gallery and bring each piece into the light.</p>
      </div>
      <div className="scroll-cue">Scroll to enter</div>
    </section>
  );
}

function FlatGallery() {
  // Reduced-motion fallback: a plain grid instead of the 3D room
  return (
    <div className="flat-fallback" style={{ display: "grid" }}>
      {paintings.map((p, i) => (
        <div key={i}>
          <div className="canvas-box">
            <div className="art" style={{ "--ar": p.ar, backgroundImage: p.bg }} />
          </div>
          <div className="placard">
            <div className="title">{p.title}</div>
            <div className="meta">{metaLine(p)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function About() {
  return (
    <section className="about plain" id="about">
      <div className="about-portrait" />
      <div className="about-text">
        <div className="eyebrow">About</div>
        <h2>Emotions, told in color.</h2>
        <p>I paint in acrylic on canvas. Each piece begins as an abstract emotion — something felt before it can be named — and color is the language I choose to tell it in.</p>
        <p>I'm an artist from Vietnam, living and painting in Serbia for the past twelve years.</p>
        <div className="about-stats">
          <div><div className="num">14</div><div className="lbl">Works on display</div></div>
          <div><div className="num">12</div><div className="lbl">Years in Serbia</div></div>
          <div><div className="num">Acrylic</div><div className="lbl">On canvas</div></div>
        </div>
      </div>
    </section>
  );
}

const encodeForm = (data) =>
  Object.keys(data)
    .map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(data[k]))
    .join("&");

function Contact() {
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error

  // Netlify Forms only processes a plain POST to "/" with the same
  // form-name it saw at build time (see the hidden twin in index.html) —
  // there's no backend here to submit to otherwise.
  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setStatus("sending");
    try {
      const res = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: encodeForm(data)
      });
      if (!res.ok) throw new Error("Form submission failed");
      form.reset();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <section className="contact plain" id="contact">
        <div className="eyebrow">Inquiries</div>
        <h2>Thank you.</h2>
        <p>Your inquiry is on its way — I reply within a couple of days.</p>
      </section>
    );
  }

  return (
    <section className="contact plain" id="contact">
      <div className="eyebrow">Inquiries</div>
      <h2>Interested in a piece?</h2>
      <p>For availability, pricing, or commission requests, send a note — I reply within a couple of days.</p>
      <form
        className="contact-form"
        name="contact"
        method="POST"
        data-netlify="true"
        data-netlify-honeypot="bot-field"
        onSubmit={handleSubmit}
      >
        <input type="hidden" name="form-name" value="contact" />
        <p hidden>
          <label>
            Don't fill this out if you're human: <input name="bot-field" />
          </label>
        </p>
        <input type="text" name="name" placeholder="Your name" required />
        <input type="email" name="email" placeholder="Email address" required />
        <textarea name="message" placeholder="Which painting, or what you have in mind" />
        {status === "error" && (
          <p className="form-error">Something went wrong sending that — please try again, or email me directly.</p>
        )}
        <button type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Send inquiry"}
        </button>
      </form>
    </section>
  );
}

export default function App() {
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <>
      <Nav />
      <Hero />
      {reducedMotion ? <FlatGallery /> : <Rotunda />}
      <About />
      <Contact />
      <footer>
        <span>&copy; 2026 Nhu</span>
        <span>
          <a href="https://www.instagram.com/hyezhu" target="_blank" rel="noopener noreferrer">Instagram</a>
          &nbsp;·&nbsp; Belgrade, Serbia
        </span>
      </footer>
    </>
  );
}
