/**
 * Which flavour of English Yap teaches.
 *
 * Set ENGLISH_VARIANT in .env.local:
 *   both (default) — shared Australasian register, no region-only slang
 *   nz             — leans New Zealand
 *   au             — leans Australian
 *
 * NEXT_PUBLIC_ENGLISH_VARIANT mirrors it to the browser so the shadowing
 * audio picks a matching voice.
 */
export type EnglishVariant = "both" | "nz" | "au";

function normalise(raw: string | undefined): EnglishVariant {
  return raw === "nz" || raw === "au" ? raw : "both";
}

export const ENGLISH_VARIANT = normalise(process.env.ENGLISH_VARIANT);

export const PUBLIC_ENGLISH_VARIANT = normalise(
  process.env.NEXT_PUBLIC_ENGLISH_VARIANT ?? process.env.ENGLISH_VARIANT,
);

/** BCP-47 tags to try, best first, when choosing a speech-synthesis voice. */
export function voicePreference(variant: EnglishVariant): string[] {
  const au = ["en-AU", "en-NZ", "en-GB", "en"];
  const nz = ["en-NZ", "en-AU", "en-GB", "en"];
  if (variant === "au") return au;
  if (variant === "nz") return nz;
  return nz; // "both" — either accent is fine, NZ voices are rarer so try first
}

const SHARED = `ENGLISH VARIANT — Australian / New Zealand English
Every English sentence you write must sound like someone from Australia or New Zealand, not the US. This applies to the question, the hints, the rewrite, the expressions, the shadowing lines and the example sentences.

SPELLING — Commonwealth throughout, no exceptions:
realise, organise, apologise, recognise, colour, favourite, behaviour, honour, centre, metre, theatre, travelled, cancelled, modelling, learnt, spelt, burnt, defence, offence, grey, tyre, kerb, aluminium, maths (never "math"), programme (a TV programme), catalogue, dialogue, enrol, fulfil, skilful.
Watch the noun/verb pairs: practice (noun) / practise (verb), licence (noun) / license (verb).

VOCABULARY — use the local word, not the American one:
uni (not college), flat and flatmate (not apartment / roommate), footpath (not sidewalk), car park (not parking lot), petrol (not gas), lift (not elevator), rubbish and rubbish bin (not trash / garbage), holiday (not vacation), takeaway (not takeout), queue (not line), CV (not resume), mobile (not cell phone), biscuit (not cookie), lolly (not candy), chips (not fries), capsicum (not bell pepper), jumper (not sweater), togs (not swimsuit), the loo, fortnight, torch (not flashlight), boot and bonnet of a car, autumn (not fall), Year 12 (not 12th grade), postcode (not zip code), tap (not faucet).

IDIOM AND GRAMMAR:
- on the weekend (not "on weekends"), in hospital (not "in the hospital"), at uni, different to, "have got" for possession.
- Everyday words: heaps (= a lot), keen (= up for it), reckon (= think), no worries / all good, good on you, chuffed, knackered, dodgy, sort it out, have a crack at it, pop out, flat out (= very busy).
- Thanks is "cheers" or "ta". "Mate" only where it genuinely fits — never in every sentence.

REGISTER — this is the part people get wrong:
Australians and New Zealanders understate. They undersell rather than oversell, and warmth comes across as relaxed and dry, not loud. Prefer "yeah, that's not bad at all" and "pretty solid, that" over "AMAZING!!" or "You're crushing it!". Use full stops where an American would use an exclamation mark.
Never use American cheerleading — "awesome job", "you got this", "way to go", "nailed it", "so proud of you" — and never American corporate filler like "reach out", "circle back", "touch base".

DON'T CARICATURE IT. One or two natural local touches per response is plenty. The learner needs English they can actually use, not a novelty accent. If it reads like a tourism advert, you've gone too far.

TREAT AMERICANISMS AS REAL MISTAKES. If the learner writes "elevator", "apartment", "vacation", "gotten", "color" or similar, that is worth listing as a mistake — original "I took the elevator", better "I took the lift" — because they're learning this variety specifically.`;

const LEAN: Record<EnglishVariant, string> = {
  both: `Stick to words shared across both countries. Avoid slang that only works in one — no "arvo", "servo", "thongs", "sweet as", "chur", "jandals" or "dairy" — since the learner isn't tied to one country.`,
  nz: `Lean New Zealand specifically. Natural to use: sweet as, chur, heaps good, tramping (not hiking), the dairy (corner shop), jandals (not thongs or flip-flops), bach (holiday house), togs, chilly bin, "yeah nah". Kiwi vowels are flatter, so favour short, level phrasing over drawled emphasis.`,
  au: `Lean Australian specifically. Natural to use: arvo, brekkie, servo, bottle-o, thongs (the footwear), esky, barbie, "how ya going", "too easy", "no dramas", "reckon so". Australians shorten words constantly — that clipping is the signature.`,
};

export function englishVariantRules(variant: EnglishVariant): string {
  return `${SHARED}\n\nREGIONAL LEAN\n${LEAN[variant]}`;
}
