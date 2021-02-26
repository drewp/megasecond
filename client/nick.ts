export function getOrCreateNick(): string {
  const url = new URL(window.location.href);
  const qparams = url.searchParams;
  if (!qparams.has("nick")) {
    let pairs: string[] = [];
    pairs = pairs.concat(["th", "ar", "he", "te", "an", "se", "in", "me", "er", "sa"]);
    pairs = pairs.concat(["nd", "ne", "re", "wa", "ed", "ve", "es", "le", "ou", "no"]);
    pairs = pairs.concat(["to", "ta", "ha", "al", "en", "de", "ea", "ot", "st", "so"]);

    let nick = "";
    for (let i = 2 + Math.random() * 2; i > 0; i--) {
      nick += pairs[Math.floor(Math.random() * pairs.length)];
    }

    qparams.append("nick", nick);
    window.location.replace(url.toString());
  }
  return qparams.get("nick")!;
}
