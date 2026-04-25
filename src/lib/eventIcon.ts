// Map countries (and major cities → country) to flag emoji.
// Used by the Trips & Events page so an event named "Colombia" or "Bogotá"
// shows 🇨🇴 instead of whatever the top spending category was.

const COUNTRY_FLAGS: Record<string, string> = {
  // Americas
  "colombia": "🇨🇴", "bogota": "🇨🇴", "bogotá": "🇨🇴", "medellin": "🇨🇴", "medellín": "🇨🇴", "cartagena": "🇨🇴",
  "usa": "🇺🇸", "us": "🇺🇸", "united states": "🇺🇸", "america": "🇺🇸",
  "new york": "🇺🇸", "nyc": "🇺🇸", "miami": "🇺🇸", "los angeles": "🇺🇸", "la": "🇺🇸",
  "san francisco": "🇺🇸", "sf": "🇺🇸", "chicago": "🇺🇸", "boston": "🇺🇸", "cape cod": "🇺🇸",
  "canada": "🇨🇦", "toronto": "🇨🇦", "vancouver": "🇨🇦", "montreal": "🇨🇦",
  "mexico": "🇲🇽", "cdmx": "🇲🇽", "mexico city": "🇲🇽", "tulum": "🇲🇽", "cancun": "🇲🇽", "cancún": "🇲🇽",
  "argentina": "🇦🇷", "buenos aires": "🇦🇷",
  "brazil": "🇧🇷", "brasil": "🇧🇷", "rio": "🇧🇷", "rio de janeiro": "🇧🇷", "sao paulo": "🇧🇷", "são paulo": "🇧🇷",
  "chile": "🇨🇱", "santiago": "🇨🇱",
  "peru": "🇵🇪", "lima": "🇵🇪", "cusco": "🇵🇪",
  "uruguay": "🇺🇾",
  "ecuador": "🇪🇨",
  "costa rica": "🇨🇷",
  "cuba": "🇨🇺", "havana": "🇨🇺",

  // Europe
  "spain": "🇪🇸", "españa": "🇪🇸", "madrid": "🇪🇸", "barcelona": "🇪🇸", "bcn": "🇪🇸", "sevilla": "🇪🇸", "seville": "🇪🇸",
  "portugal": "🇵🇹", "lisbon": "🇵🇹", "lisboa": "🇵🇹", "porto": "🇵🇹",
  "france": "🇫🇷", "paris": "🇫🇷", "nice": "🇫🇷", "lyon": "🇫🇷", "marseille": "🇫🇷",
  "italy": "🇮🇹", "italia": "🇮🇹", "rome": "🇮🇹", "roma": "🇮🇹", "milan": "🇮🇹", "milano": "🇮🇹",
  "florence": "🇮🇹", "venice": "🇮🇹", "naples": "🇮🇹", "sicily": "🇮🇹",
  "germany": "🇩🇪", "berlin": "🇩🇪", "munich": "🇩🇪", "hamburg": "🇩🇪",
  "uk": "🇬🇧", "england": "🇬🇧", "london": "🇬🇧", "scotland": "🇬🇧", "edinburgh": "🇬🇧",
  "ireland": "🇮🇪", "dublin": "🇮🇪",
  "netherlands": "🇳🇱", "holland": "🇳🇱", "amsterdam": "🇳🇱",
  "belgium": "🇧🇪", "brussels": "🇧🇪",
  "switzerland": "🇨🇭", "zurich": "🇨🇭", "geneva": "🇨🇭",
  "austria": "🇦🇹", "vienna": "🇦🇹",
  "greece": "🇬🇷", "athens": "🇬🇷", "santorini": "🇬🇷", "mykonos": "🇬🇷",
  "norway": "🇳🇴", "oslo": "🇳🇴",
  "sweden": "🇸🇪", "stockholm": "🇸🇪",
  "denmark": "🇩🇰", "copenhagen": "🇩🇰",
  "finland": "🇫🇮", "helsinki": "🇫🇮",
  "iceland": "🇮🇸", "reykjavik": "🇮🇸",
  "poland": "🇵🇱", "warsaw": "🇵🇱", "krakow": "🇵🇱",
  "czech": "🇨🇿", "czechia": "🇨🇿", "prague": "🇨🇿",
  "hungary": "🇭🇺", "budapest": "🇭🇺",
  "croatia": "🇭🇷", "split": "🇭🇷", "dubrovnik": "🇭🇷",
  "turkey": "🇹🇷", "istanbul": "🇹🇷",

  // Africa
  "morocco": "🇲🇦", "marrakech": "🇲🇦", "marrakesh": "🇲🇦", "casablanca": "🇲🇦",
  "egypt": "🇪🇬", "cairo": "🇪🇬",
  "south africa": "🇿🇦", "cape town": "🇿🇦", "johannesburg": "🇿🇦",
  "kenya": "🇰🇪", "nairobi": "🇰🇪",
  "tanzania": "🇹🇿",

  // Asia
  "japan": "🇯🇵", "tokyo": "🇯🇵", "kyoto": "🇯🇵", "osaka": "🇯🇵",
  "china": "🇨🇳", "beijing": "🇨🇳", "shanghai": "🇨🇳", "hong kong": "🇭🇰", "hk": "🇭🇰",
  "korea": "🇰🇷", "south korea": "🇰🇷", "seoul": "🇰🇷",
  "thailand": "🇹🇭", "bangkok": "🇹🇭", "phuket": "🇹🇭", "chiang mai": "🇹🇭",
  "vietnam": "🇻🇳", "hanoi": "🇻🇳", "saigon": "🇻🇳", "ho chi minh": "🇻🇳",
  "indonesia": "🇮🇩", "bali": "🇮🇩", "jakarta": "🇮🇩",
  "philippines": "🇵🇭", "manila": "🇵🇭",
  "singapore": "🇸🇬",
  "malaysia": "🇲🇾", "kuala lumpur": "🇲🇾",
  "india": "🇮🇳", "delhi": "🇮🇳", "mumbai": "🇮🇳", "goa": "🇮🇳",
  "uae": "🇦🇪", "dubai": "🇦🇪", "abu dhabi": "🇦🇪",
  "israel": "🇮🇱", "tel aviv": "🇮🇱", "jerusalem": "🇮🇱",

  // Oceania
  "australia": "🇦🇺", "sydney": "🇦🇺", "melbourne": "🇦🇺",
  "new zealand": "🇳🇿", "auckland": "🇳🇿",
};

// Returns a flag emoji if the event name contains a known country/city,
// otherwise null so callers can fall back to a category emoji.
export function getEventFlag(eventName: string): string | null {
  if (!eventName) return null;
  const lower = eventName.toLowerCase();

  // Try direct multi-word matches first (longest keys win to avoid
  // "korea" matching before "south korea").
  const keys = Object.keys(COUNTRY_FLAGS).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    // Word-boundary-ish check: surrounded by start/end or non-letter.
    const re = new RegExp(`(^|[^a-záéíóúñü])${escapeRegex(key)}([^a-záéíóúñü]|$)`, "i");
    if (re.test(lower)) return COUNTRY_FLAGS[key];
  }
  return null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
