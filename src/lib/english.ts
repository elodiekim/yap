/**
 * Which flavour of English Yap teaches.
 *
 * Set ENGLISH_VARIANT in .env.local:
 *   anz (default) — shared Australian/New Zealand register, no region-only slang
 *   nz            — leans New Zealand
 *   au            — leans Australian
 *   us            — General American
 *
 * "both" is still accepted as the old name for "anz".
 *
 * NEXT_PUBLIC_ENGLISH_VARIANT mirrors it to the browser so the shadowing
 * audio picks a matching voice.
 */
export type EnglishVariant = "anz" | "nz" | "au" | "us";

const ALIASES: Record<string, EnglishVariant> = {
  anz: "anz",
  both: "anz", // what "anz" was called before American English existed
  nz: "nz",
  au: "au",
  aus: "au",
  us: "us",
  usa: "us",
};

function normalise(raw: string | undefined): EnglishVariant {
  return ALIASES[raw?.trim().toLowerCase() ?? ""] ?? "anz";
}

export const ENGLISH_VARIANT = normalise(process.env.ENGLISH_VARIANT);

export const PUBLIC_ENGLISH_VARIANT = normalise(
  process.env.NEXT_PUBLIC_ENGLISH_VARIANT ?? process.env.ENGLISH_VARIANT,
);

/** BCP-47 tags to try, best first, when choosing a speech-synthesis voice. */
export function voicePreference(variant: EnglishVariant): string[] {
  switch (variant) {
    case "us":
      return ["en-US", "en-CA", "en"];
    case "au":
      return ["en-AU", "en-NZ", "en-GB", "en"];
    // "anz" has no preference between the two, and NZ voices are the rarer
    // of the pair, so try that one first either way.
    default:
      return ["en-NZ", "en-AU", "en-GB", "en"];
  }
}

/** Where the tutor is from, for the persona sentence. */
export function speakerHome(variant: EnglishVariant): string {
  switch (variant) {
    case "us":
      return "the United States";
    case "nz":
      return "New Zealand";
    case "au":
      return "Australia";
    default:
      return "Australia or New Zealand";
  }
}

/** How to name a native speaker of this variety, mid-sentence. */
export function nativeSpeaker(variant: EnglishVariant): string {
  switch (variant) {
    case "us":
      return "an American";
    case "nz":
      return "a New Zealander";
    case "au":
      return "an Australian";
    default:
      return "an Australian or New Zealander";
  }
}

/** Korean label for UI copy, e.g. "미국식 발음". */
export function variantKo(variant: EnglishVariant): string {
  switch (variant) {
    case "us":
      return "미국";
    case "nz":
      return "뉴질랜드";
    case "au":
      return "호주";
    default:
      return "호주·뉴질랜드";
  }
}

/* -------------------------------------------------------------------------
 * The rules themselves. Two families — Commonwealth (anz/nz/au) and
 * American — each with a base block plus a narrower regional lean.
 * ---------------------------------------------------------------------- */

const COMMONWEALTH = `ENGLISH VARIANT — Australian / New Zealand English
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

const AMERICAN = `ENGLISH VARIANT — American English
Every English sentence you write must sound like someone from the US. This applies to the question, the hints, the rewrite, the expressions, the shadowing lines and the example sentences.

SPELLING — American throughout, no exceptions:
realize, organize, apologize, recognize, color, favorite, behavior, honor, center, meter, theater, traveled, canceled, modeling, learned, spelled, burned, defense, offense, gray, tire, curb, aluminum, math (never "maths"), program, catalog, dialogue, enroll, fulfill, skillful.
"Practice" and "license" are spelt the same as noun and verb — no practise/licence.

VOCABULARY — use the American word:
college (not uni), apartment and roommate (not flat / flatmate), sidewalk (not footpath), parking lot (not car park), gas (not petrol), elevator (not lift), trash and trash can (not rubbish bin), vacation (not holiday), takeout (not takeaway), line (not queue), resume (not CV), cell phone (not mobile), cookie (not biscuit), candy (not lolly), fries (not chips), bell pepper (not capsicum), sweater (not jumper), swimsuit (not togs), the bathroom or restroom (not the loo), two weeks (not fortnight), flashlight (not torch), trunk and hood of a car, fall (not autumn), 12th grade (not Year 12), zip code (not postcode), faucet (not tap).

IDIOM AND GRAMMAR:
- on weekends, in the hospital, in college, different from or different than, "have" rather than "have got".
- "gotten" is the normal past participle: "I've gotten a lot better at it."
- Simple past where Commonwealth English reaches for the present perfect: "Did you eat yet?", "I already finished."
- Everyday words: a ton of / a bunch of (= a lot), up for it, figure it out, take a shot at it, swamped (= very busy), beat or wiped (= exhausted), sketchy, no problem / sure thing / you bet.

REGISTER — this is the part people get wrong:
Americans are warmer and more openly enthusiastic than Australians or New Zealanders. Praise is direct and specific, and an exclamation mark reads as friendly rather than fake. That warmth is real, so use it — but keep it grounded. Say what was actually good instead of stacking hype: "That second sentence is really clear" beats "AMAZING WORK!!!" every time.
Avoid corporate filler — "reach out", "circle back", "touch base", "let's unpack that", "at the end of the day". Avoid motivational-poster language too: "you got this", "crushing it", "living your best life" wear out fast.

DON'T CARICATURE IT. The learner needs English they can actually use in a meeting or a conversation, not sitcom dialogue.

TREAT COMMONWEALTH FORMS AS WORTH FIXING. If the learner writes "lift", "flat", "colour", "maths" or "on the weekend", note it — original "I took the lift", better "I took the elevator", with a reason explaining that Americans say it the other way. Keep the tone light: these aren't errors in English, they're just the other variety, and the learner picked this one.`;

const LEAN: Record<EnglishVariant, string> = {
  anz: `Stick to words shared across both countries. Avoid slang that only works in one — no "arvo", "servo", "thongs", "sweet as", "chur", "jandals" or "dairy" — since the learner isn't tied to one country.`,
  nz: `Lean New Zealand specifically. Natural to use: sweet as, chur, heaps good, tramping (not hiking), the dairy (corner shop), jandals (not thongs or flip-flops), bach (holiday house), togs, chilly bin, "yeah nah". Kiwi vowels are flatter, so favour short, level phrasing over drawled emphasis.`,
  au: `Lean Australian specifically. Natural to use: arvo, brekkie, servo, bottle-o, thongs (the footwear), esky, barbie, "how ya going", "too easy", "no dramas", "reckon so". Australians shorten words constantly — that clipping is the signature.`,
  us: `Use General American — the neutral register of national news and most workplaces, understood everywhere in the country. Avoid strongly regional slang: no "y'all", "wicked", "hella", "jawn", "bless your heart". The learner needs English that travels across the whole US.`,
};

export function englishVariantRules(variant: EnglishVariant): string {
  const base = variant === "us" ? AMERICAN : COMMONWEALTH;
  return `${base}\n\nREGIONAL LEAN\n${LEAN[variant]}`;
}
