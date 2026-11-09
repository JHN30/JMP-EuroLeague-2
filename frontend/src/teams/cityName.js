// The English name of a city the warehouse keeps in its local or older spelling.
const CITY_NAMES = {
  Roma: "Rome",
  Napoli: "Naples",
  Cantu: "Cantù",
  Malaga: "Málaga",
  Kiev: "Kyiv",
  "Karsıyaka, İzmir": "İzmir",
};

export function cityName(city) {
  if (!city) return null;
  return CITY_NAMES[city] ?? city;
}
