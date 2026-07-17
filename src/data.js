// Gallery data — bg points at files in /public/images.
// ar is each work's exact aspect ratio so it fits its frame precisely.
export const paintings = [
  { title: "Gilded Crown", medium: "Acrylic on canvas", size: "", year: "2021", ar: "1570/1600", bg: "url('/images/painting-01.jpg')" },
  { title: "Lotus, in Grey and Gold", medium: "Acrylic on canvas", size: "", year: "", ar: "1151/1600", bg: "url('/images/painting-02.jpg')" },
  { title: "The Street Vendor", medium: "Acrylic on canvas", size: "", year: "", ar: "1600/1178", bg: "url('/images/painting-03.jpg')" },
  { title: "Cosmic Octopus", medium: "Acrylic on canvas", size: "", year: "", ar: "1600/1327", bg: "url('/images/painting-04.jpg')" },
  { title: "Gold over Violet", medium: "Acrylic on canvas", size: "", year: "", ar: "1000/1600", bg: "url('/images/painting-05.jpg')" },
  { title: "The Hourglass", medium: "Acrylic on canvas", size: "", year: "2023", ar: "1200/1600", bg: "url('/images/painting-06.jpg')" },
  { title: "Undine", medium: "Acrylic on canvas", size: "", year: "2020", ar: "1281/1600", bg: "url('/images/painting-07.jpg')" },
  { title: "Kitsune and Blossoms", medium: "Acrylic on canvas", size: "", year: "", ar: "1341/1600", bg: "url('/images/painting-08.jpg')" },
  { title: "Bloom in the Dark", medium: "Acrylic on canvas", size: "", year: "", ar: "1165/1600", bg: "url('/images/painting-09.jpg')" },
  { title: "Savanna of the Mind", medium: "Acrylic on canvas", size: "", year: "", ar: "1113/1600", bg: "url('/images/painting-10.jpg')" },
  { title: "Falling Eyes", medium: "Acrylic on canvas", size: "", year: "2021", ar: "984/1600", bg: "url('/images/painting-11.jpg')" },
  { title: "She Blooms", medium: "Acrylic on canvas", size: "", year: "", ar: "1315/1600", bg: "url('/images/painting-12.jpg')" },
  { title: "Duality", medium: "Acrylic on canvas", size: "", year: "2020", ar: "1111/1600", bg: "url('/images/painting-13.jpg')" },
  { title: "Flower Crown", medium: "Acrylic on canvas", size: "", year: "", ar: "1200/1600", bg: "url('/images/painting-14.jpg')" }
];

export const metaLine = (p) => [p.medium, p.size, p.year].filter(Boolean).join(" \u00b7 ");

export const N = paintings.length;
export const STEP = 360 / N;
export const RADIUS = 760;
export const CENTER_PULL = 380;

export const panelWidth = (p) => {
  const [aw, ah] = p.ar.split("/").map(Number);
  return Math.round(Math.min(430, Math.max(250, 330 * Math.sqrt(aw / ah))));
};

export const mod = (a) => ((a % N) + N) % N;
