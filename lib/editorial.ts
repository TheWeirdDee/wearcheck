/**
 * Editorial photographs used on public pages. All are CC0 (Unsplash originals mirrored on
 * Wikimedia Commons); full provenance is in /public/editorial/LICENSES.json.
 * They illustrate scenarios only. They are never sent to Gemini or YouCam and are never shown
 * as a WearCheck assessment or a YouCam result.
 */
export type EditorialImage = { src: string; width: number; height: number; alt: string; credit: string };

const img = (file: string, width: number, height: number, alt: string, photographer: string): EditorialImage => ({
  src: `/editorial/${file}`,
  width,
  height,
  alt,
  credit: `Editorial photo · ${photographer} / Unsplash (CC0)`,
});

export const EDITORIAL = {
  hero: img("hero-brick-wall.jpg", 1440, 1800, "A man standing in front of a white brick wall in a rust overshirt, white T-shirt, black jeans and suede boots.", "Brooke Cagle"),
  colonnade: img("story-colonnade.jpg", 1800, 1360, "A woman in a long, pale floral dress turning in a stone colonnade.", "Flaunter"),
  jumpsuit: img("story-jumpsuit.jpg", 1440, 1800, "A woman in a teal halter-neck jumpsuit, photographed from the thighs up.", "Darko Mitev"),
  street: img("example-street.jpg", 1440, 1800, "A woman in a hat, leather jacket and patterned skirt holding a coffee on a city street.", "Pete Bellis"),
  evening: img("example-evening.jpg", 1200, 1800, "Black-and-white photograph of two men in dark coats and ties against a pale wall.", "Caleb Betts"),
  whiteWall: img("editorial-white-wall.jpg", 1440, 1800, "A woman in a striped top and jeans holding a grey faux-fur wrap against a white wall.", "Pete Bellis"),
  guideGood: img("hero-brick-wall.jpg", 1440, 1800, "Example of a good photo: one person, standing, head to feet in frame, plain wall, even daylight.", "Brooke Cagle"),
  guideFeet: img("guide-feet-cropped.jpg", 1320, 1650, "The same photo cropped above the ankles, so the shoes are out of frame.", "Brooke Cagle"),
  guideDark: img("guide-low-light.jpg", 1440, 1800, "The same photo darkened to simulate poor lighting; colours are hard to read.", "Brooke Cagle"),
  guideTwo: img("guide-two-people.jpg", 1440, 1800, "Two people in one photo, one crouching and one standing, against a white wall.", "WillSpirit"),
} as const;
