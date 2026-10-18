export interface RomanticQuote {
  quote: string;
  author: string;
}

export const ROMANTIC_QUOTES: RomanticQuote[] = [
  {
    quote: "Some moments become memories. Some memories become home.",
    author: "Forever Us",
  },
  {
    quote: "In a world full of passing things, you are my favorite forever.",
    author: "Forever Us",
  },
  {
    quote: "One little moment with you is worth a thousand ordinary days.",
    author: "Forever Us",
  },
  {
    quote: "Our story is my favorite place to return to.",
    author: "Forever Us",
  },
  {
    quote: "If I could save one feeling forever, it would be the feeling of being with you.",
    author: "Forever Us",
  },
  {
    quote: "Years from now, I hope we still smile at the little things.",
    author: "Forever Us",
  },
  {
    quote: "Not every beautiful thing needs to be shared with the world.",
    author: "Forever Us",
  },
  {
    quote: "A thousand photographs, a million feelings, one us.",
    author: "Forever Us",
  },
  {
    quote: "Every second with you is a little miracle folded into my heart.",
    author: "Forever Us",
  },
  {
    quote: "I loved you yesterday, I love you still, I always have, I always will.",
    author: "Forever Us",
  },
];

export function getRandomQuote(): RomanticQuote {
  const index = Math.floor(Math.random() * ROMANTIC_QUOTES.length);
  return ROMANTIC_QUOTES[index];
}
