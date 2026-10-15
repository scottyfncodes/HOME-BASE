/**
 * Curated homeowner guidance. Plain, conservative, and general: nothing here
 * claims to know a specific product's requirements. Every guide points the
 * reader to their manufacturer's instructions and to a licensed professional
 * for anything involving gas, mains electricity, structure or roofs.
 */

export type Guide = {
  slug: string;
  title: string;
  summary: string;
  /** Asset categories this guide is relevant to. */
  categories: string[];
  /** Lower-case keywords matched against task titles. */
  keywords: string[];
  suggestedFrequency?: string;
  sections: Array<{ heading: string; body?: string; items?: string[] }>;
  safety: string[];
  callAPro: string[];
};

export const GUIDES: Guide[] = [
  {
    slug: "hvac-filter",
    title: "Changing your furnace or AC filter",
    summary: "The single most useful habit for heating and cooling: a clean filter protects the equipment and your air.",
    categories: ["hvac"],
    keywords: ["filter", "furnace", "hvac", "air handler"],
    suggestedFrequency: "Every 1–3 months during heavy use; check monthly.",
    sections: [
      { heading: "Why it matters", body: "A clogged filter makes the blower work harder, reduces airflow, and can lead to frozen coils or overheating. Replacement filters are cheap compared with a service call." },
      { heading: "Steps", items: ["Turn the system off at the thermostat before opening the filter slot.", "Note the size printed on the old filter's frame (for example 16×25×1) and record it in this item's notes.", "Slide the old filter out and look at the airflow arrow on its frame.", "Insert the new filter with the arrow pointing toward the blower (into the unit, away from the return duct).", "Close the cover, turn the system back on, and log the change here so the next one is scheduled."] },
      { heading: "Choosing a filter", body: "Higher MERV ratings catch finer particles but can restrict airflow on some systems. Stay within what your equipment's manual recommends." },
    ],
    safety: ["Always switch the system off before opening it.", "Never run the system without a filter."],
    callAPro: ["Ice on the coil or refrigerant lines.", "Burning smells, repeated short cycling, or breakers tripping.", "Annual tune-ups are worth it for furnaces and heat pumps."],
  },
  {
    slug: "hvac-seasonal",
    title: "Seasonal heating and cooling checks",
    summary: "A short spring and fall routine that catches most problems before the first very hot or very cold day.",
    categories: ["hvac"],
    keywords: ["hvac", "tune-up", "ac", "air conditioner", "heat pump", "furnace", "condenser"],
    suggestedFrequency: "Twice a year: before cooling season and before heating season.",
    sections: [
      { heading: "Outdoor unit", items: ["Clear leaves, grass clippings and debris at least two feet around the condenser.", "Gently rinse the fins with a hose from the inside out (no pressure washer).", "Make sure the unit sits level and the pad has not sunk."] },
      { heading: "Indoor", items: ["Replace the filter.", "Check that the condensate drain line drips freely during cooling; pour a cup of water into the drain pan access if your manual allows.", "Listen for new rattles or grinding at startup.", "Test the thermostat by raising and lowering the setpoint a few degrees."] },
      { heading: "Records", body: "Log tune-ups with the technician's name and what they found. Patterns across years are how you decide when to replace rather than repair." },
    ],
    safety: ["Turn off power at the disconnect before touching the outdoor unit.", "Do not open the furnace cabinet beyond the filter door unless the manual describes it."],
    callAPro: ["Any refrigerant work (it requires a license).", "Gas burner, heat exchanger or ignition issues.", "Electrical faults or repeated breaker trips."],
  },
  {
    slug: "water-heater",
    title: "Water heater basics",
    summary: "Temperature, sediment and the relief valve: three things that extend a water heater's life and keep it safe.",
    categories: ["water_heater", "plumbing"],
    keywords: ["water heater", "flush", "anode", "tankless", "descale"],
    suggestedFrequency: "Visual check yearly; flush per the manual (often yearly in hard-water areas).",
    sections: [
      { heading: "Look around it", items: ["Check the floor and fittings for moisture or rust streaks.", "Confirm the pressure relief valve discharge pipe points down and ends a few inches above the floor or a drain.", "Note the manufacture date on the data plate; tank heaters commonly last 8–12 years."] },
      { heading: "Temperature", body: "Many manufacturers and safety organizations suggest around 120°F (49°C) to reduce scald risk and energy use. Follow your manual's guidance, especially if you have a dishwasher without its own heater." },
      { heading: "Sediment", body: "Draining a few gallons from the bottom valve can remove sediment that causes rumbling and lost efficiency. Follow the manual's procedure exactly; it involves turning off power or gas and the cold-water supply first." },
    ],
    safety: ["Water at the drain valve is hot enough to scald.", "Do not test the relief valve unless your manual describes it; an old valve may not reseal.", "If you smell gas, leave and call your gas utility from outside."],
    callAPro: ["Any gas-related issue, pilot or burner problems.", "Leaks from the tank itself (the tank cannot be repaired).", "Anode rod replacement if you are not comfortable with large wrenches and hot water."],
  },
  {
    slug: "smoke-co-detectors",
    title: "Smoke and carbon monoxide detectors",
    summary: "Test monthly, change batteries yearly, replace the units themselves on schedule.",
    categories: ["safety"],
    keywords: ["smoke", "detector", "alarm", "carbon monoxide", "co", "battery"],
    suggestedFrequency: "Test monthly. Batteries yearly. Replace smoke alarms about every 10 years and CO alarms per the label (often 5–10 years).",
    sections: [
      { heading: "Monthly test", items: ["Press and hold the test button until it sounds.", "Walk through the house: interconnected alarms should all sound.", "Note any that chirp or stay silent."] },
      { heading: "Replacement", body: "Every alarm has a manufacture date printed on the back. Record each unit in Inventory with that date so Home Base can remind you before it ages out." },
      { heading: "Placement", body: "Fire-safety organizations recommend alarms inside each bedroom, outside sleeping areas, and on every level. CO alarms belong near sleeping areas and on each level with fuel-burning appliances." },
    ],
    safety: ["Never disable an alarm to stop nuisance chirps; replace the battery or the unit.", "If a CO alarm sounds, get everyone outside and call emergency services."],
    callAPro: ["Hard-wired alarm wiring or interconnect problems.", "Persistent CO alarms: have appliances and venting inspected."],
  },
  {
    slug: "gutters",
    title: "Gutters and downspouts",
    summary: "Water that is kept away from the foundation is the cheapest insurance a house has.",
    categories: ["roofing", "exterior"],
    keywords: ["gutter", "downspout", "drainage"],
    suggestedFrequency: "Twice a year, after leaf drop and in spring; more often under trees.",
    sections: [
      { heading: "What to do", items: ["Remove leaves and grit; flush with a hose and watch for standing water (a sign of sag).", "Confirm downspouts discharge at least a few feet from the foundation, ideally onto splash blocks or extensions.", "Look for loose hangers, separated seams and rust.", "Check fascia boards behind the gutter for soft spots."] },
    ],
    safety: ["Ladder work causes serious injuries. Use a stable ladder on firm ground, keep three points of contact, and never lean out.", "Stay well clear of overhead power lines."],
    callAPro: ["Second-story gutters if you are not comfortable on a ladder.", "Gutters pulling away from the house or fascia rot."],
  },
  {
    slug: "water-shutoff",
    title: "Finding and testing your main water shutoff",
    summary: "In a burst-pipe emergency you have seconds. Know where the valve is and make sure it turns.",
    categories: ["plumbing"],
    keywords: ["shutoff", "shut-off", "water main", "valve"],
    suggestedFrequency: "Locate it today; exercise the valve yearly.",
    sections: [
      { heading: "Where to look", items: ["Where the water line enters the house: basement wall nearest the street, crawl space, utility room, or garage.", "Near the water heater or pressure regulator.", "In warm climates, in a box near the street or along the exterior wall.", "Record it in Preparedness with a photo."] },
      { heading: "Types", body: "A lever handle (ball valve) turns a quarter turn: handle across the pipe is closed. A round wheel (gate valve) turns clockwise several times to close." },
      { heading: "Yearly exercise", body: "Close and reopen the valve slowly so it does not seize. If it drips from the stem afterwards, a plumber can tighten or replace it." },
    ],
    safety: ["If the valve is stuck, do not force it with tools; a snapped valve floods the house."],
    callAPro: ["Replacing a seized or leaking main valve.", "Any work on the street-side (utility) valve: that belongs to the water utility."],
  },
  {
    slug: "gas-safety",
    title: "If you smell gas",
    summary: "Leave first, call second. Everything else can wait.",
    categories: ["hvac", "water_heater", "appliance"],
    keywords: ["gas", "propane", "leak"],
    sections: [
      { heading: "Right away", items: ["Do not flip switches, unplug anything, use a phone inside, or light anything.", "Get everyone, including pets, outside.", "From outside, call your gas utility's emergency line or 911.", "Do not go back in until the utility says it is safe."] },
      { heading: "Beforehand", body: "Know where your gas meter and its shutoff are, and record them in Preparedness. Most utilities say you may close the meter valve with a wrench in an emergency but must not reopen it yourself." },
    ],
    safety: ["Never attempt to find a gas leak yourself."],
    callAPro: ["All gas appliance installation, repair and reconnection must be done by a licensed professional."],
  },
  {
    slug: "electrical-panel",
    title: "Understanding your electrical panel",
    summary: "Label it, keep it clear, and know what you should never do inside it.",
    categories: ["electrical"],
    keywords: ["breaker", "panel", "electrical", "gfci", "outlet"],
    suggestedFrequency: "Label breakers once; test GFCI outlets monthly; check AFCI/GFCI breakers per their label.",
    sections: [
      { heading: "Labeling", body: "With a helper, flip each breaker and note what loses power. Write clear labels on the panel door and record them in Preparedness so anyone in the household can find the right breaker." },
      { heading: "Keep it accessible", body: "Codes typically require clear space in front of the panel. Do not store things against it." },
      { heading: "GFCI outlets", body: "Press TEST (power should cut) then RESET monthly on outlets in kitchens, bathrooms, garages and outdoors." },
    ],
    safety: ["Never remove the panel's inner cover (the dead front). The bus bars behind it stay live even with the main off.", "Warm breakers, scorch marks, buzzing, or a burning smell mean call an electrician now."],
    callAPro: ["Adding circuits, replacing breakers, or anything behind the dead front.", "Frequent trips on the same breaker.", "Federal Pacific, Zinsco, or other panels an inspector has flagged."],
  },
  {
    slug: "dryer-vent",
    title: "Cleaning the dryer vent",
    summary: "Lint in the duct is a leading cause of house fires and a common reason dryers take two cycles.",
    categories: ["appliance"],
    keywords: ["dryer", "vent", "lint"],
    suggestedFrequency: "Lint screen every load; duct yearly, or sooner if drying slows.",
    sections: [
      { heading: "Steps", items: ["Unplug the dryer (or turn off the gas valve for a gas dryer, then unplug).", "Pull the dryer out and disconnect the duct at the back.", "Clean the duct with a vent brush kit, working toward the exterior hood.", "Clear the exterior hood flap and make sure it opens freely.", "Reconnect using rigid or semi-rigid metal duct; replace crushed or foil duct."] },
    ],
    safety: ["Gas dryers: if you are unsure about the gas connection, have a professional move the unit."],
    callAPro: ["Long or inaccessible duct runs.", "Reconnecting gas lines."],
  },
  {
    slug: "sump-pump",
    title: "Sump pump checks",
    summary: "A pump that has not run in months may not run when the storm hits.",
    categories: ["plumbing", "structure"],
    keywords: ["sump", "pump", "basement", "flood"],
    suggestedFrequency: "Every 3 months and before the wet season.",
    sections: [
      { heading: "Test", items: ["Lift the float or pour a bucket of water into the pit; the pump should start and the water should drop quickly.", "Confirm the discharge line outside is clear and sends water away from the foundation.", "Check the check valve is not leaking back.", "If you have battery backup, test it and note the battery's age."] },
    ],
    safety: ["Keep hands clear of the impeller; unplug before cleaning the pit."],
    callAPro: ["Pump will not start, runs continuously, or cycles rapidly."],
  },
  {
    slug: "winter-prep",
    title: "Preparing for winter",
    summary: "A fall checklist for homes that see freezing weather.",
    categories: ["exterior", "plumbing", "outdoor", "hvac"],
    keywords: ["winter", "freeze", "hose", "spigot", "winterize"],
    suggestedFrequency: "Every fall before the first hard freeze.",
    sections: [
      { heading: "Outside", items: ["Disconnect hoses and drain outdoor spigots; close interior shutoffs if you have them.", "Blow out or drain irrigation systems.", "Clean gutters after leaf drop.", "Store or cover outdoor furniture and grills."] },
      { heading: "Inside", items: ["Have the furnace serviced and change the filter.", "Reverse ceiling fans to clockwise at low speed.", "Check weatherstripping on doors and windows.", "Know where the main water shutoff is in case of a frozen pipe."] },
    ],
    safety: ["Space heaters need three feet of clearance and should never run unattended."],
    callAPro: ["Furnace service, chimney inspection and sweeping."],
  },
  {
    slug: "roof-attic",
    title: "Roof and attic visual checks",
    summary: "You can learn a lot from the ground and from the attic hatch without ever stepping on the roof.",
    categories: ["roofing", "structure"],
    keywords: ["roof", "attic", "shingle", "flashing", "leak"],
    suggestedFrequency: "Twice a year and after major storms.",
    sections: [
      { heading: "From the ground", items: ["Look for lifted, cracked or missing shingles, and shingle grit in gutters.", "Check flashing around chimneys and vents for rust or gaps.", "Note moss or sagging areas."] },
      { heading: "From the attic", items: ["On a bright day, look for daylight through the roof deck.", "Check for water stains, damp insulation, or mold smell.", "Make sure soffit and ridge vents are not blocked by insulation."] },
    ],
    safety: ["Do not walk on the roof. Falls from roofs are a major cause of homeowner injuries."],
    callAPro: ["Any repair on the roof surface.", "Active leaks or sagging."],
  },
  {
    slug: "plumbing-leaks",
    title: "Catching plumbing leaks early",
    summary: "Most water damage starts small. A five-minute walk-through every season finds it.",
    categories: ["plumbing", "appliance"],
    keywords: ["leak", "faucet", "toilet", "caulk", "supply line"],
    suggestedFrequency: "Every 3 months.",
    sections: [
      { heading: "Walk-through", items: ["Open the cabinet under each sink and feel the fittings and the trap.", "Check toilet bases and the supply line; put a few drops of food coloring in the tank and see if it reaches the bowl without flushing.", "Inspect washing machine hoses (replace rubber hoses every 5 years or switch to braided).", "Look at the refrigerator water line and dishwasher connection.", "Read the water meter with everything off; if it moves, something is leaking."] },
      { heading: "Caulk and grout", body: "Re-caulk tubs and showers when the bead cracks or pulls away. Water behind tile is far more expensive than a tube of caulk." },
    ],
    safety: ["Know your main water shutoff before you need it."],
    callAPro: ["Leaks inside walls or ceilings.", "Low or fluctuating water pressure."],
  },
  {
    slug: "records-and-warranties",
    title: "Keeping records that pay off",
    summary: "The receipts, serial numbers and service logs that make warranty claims, insurance and resale painless.",
    categories: ["appliance", "hvac", "water_heater", "electronics", "other"],
    keywords: ["warranty", "receipt", "manual", "record"],
    sections: [
      { heading: "For every appliance or system", items: ["Photograph the data plate (model and serial) and attach it as a photo document.", "File the receipt and the warranty terms under Documents, linked to the item.", "Record the install date; warranties usually run from purchase or install.", "Log every service call with cost and provider."] },
      { heading: "For the house", items: ["Keep inspection reports, permits and contractor estimates under Documents.", "Keep deeds, titles and identity documents in the Vault, not in Documents."] },
    ],
    safety: [],
    callAPro: [],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export function guidesForCategory(category: string): Guide[] {
  return GUIDES.filter((g) => g.categories.includes(category));
}

export function guidesForTaskTitle(title: string): Guide[] {
  const t = title.toLowerCase();
  return GUIDES.filter((g) => g.keywords.some((k) => t.includes(k))).slice(0, 3);
}

/** Common tasks offered as one-tap suggestions when scheduling maintenance. */
export const TASK_SUGGESTIONS: Array<{ title: string; recurrence: string; category?: string; guideSlug?: string }> = [
  { title: "Change HVAC filter", recurrence: "3-month", category: "hvac", guideSlug: "hvac-filter" },
  { title: "Test smoke and CO detectors", recurrence: "1-month", category: "safety", guideSlug: "smoke-co-detectors" },
  { title: "Replace detector batteries", recurrence: "1-year", category: "safety", guideSlug: "smoke-co-detectors" },
  { title: "Clean gutters", recurrence: "6-month", category: "roofing", guideSlug: "gutters" },
  { title: "Flush water heater", recurrence: "1-year", category: "water_heater", guideSlug: "water-heater" },
  { title: "HVAC seasonal tune-up", recurrence: "6-month", category: "hvac", guideSlug: "hvac-seasonal" },
  { title: "Clean dryer vent", recurrence: "1-year", category: "appliance", guideSlug: "dryer-vent" },
  { title: "Test sump pump", recurrence: "3-month", guideSlug: "sump-pump" },
  { title: "Test GFCI outlets", recurrence: "1-month", category: "electrical", guideSlug: "electrical-panel" },
  { title: "Check under sinks and around toilets for leaks", recurrence: "3-month", guideSlug: "plumbing-leaks" },
  { title: "Exercise main water shutoff valve", recurrence: "1-year", guideSlug: "water-shutoff" },
  { title: "Winterize outdoor faucets and irrigation", recurrence: "1-year", guideSlug: "winter-prep" },
  { title: "Inspect roof and attic", recurrence: "6-month", guideSlug: "roof-attic" },
  { title: "Replace refrigerator water filter", recurrence: "6-month", category: "appliance" },
  { title: "Clean range hood filter", recurrence: "3-month", category: "appliance" },
  { title: "Replace washing machine hoses", recurrence: "5-year", category: "appliance", guideSlug: "plumbing-leaks" },
];
