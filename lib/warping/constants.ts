export const WARPING_SCHOOLS = [
  ["embercraft","Embercraft"],["vitalcraft","Vitalcraft"],["mindcraft","Mindcraft"],
  ["veilcraft","Veilcraft"],["waycraft","Waycraft"],["bondcraft","Bondcraft"],["runecraft","Runecraft"],
] as const;

export const ESSENCE_WORDS = [
  ["Pyr","Fire"],["Gla","Frost"],["Ful","Storm"],["Lapi","Stone"],["Acu","Water"],["Aeri","Air"],
  ["Luci","Light"],["Umri","Shadow"],["Vite","Life"],["Mori","Death"],["Cere","Mind"],["Somi","Dream"],
] as const;

export const ACTION_WORDS = [
  ["Creo","Create"],["Dis","Destroy"],["Lig","Bind"],["Rev","Reveal"],["Mut","Transform"],["Muv","Move"],
] as const;

export const LAW_WORDS = [
  ["Ego","Self"],["Eos","Creature"],["Res","Object"],["Loc","Place"],["Lim","Threshold"],["Tem","Time"],
] as const;

export const MOVEMENTS = [
  ["friction","Friction"],["opposition","Opposition"],["expansion","Expansion"],["convergence","Convergence"],
  ["ascension","Ascension"],["descent","Descent"],["direction","Direction"],["projection","Projection"],
  ["expulsion","Expulsion"],["sweep","Sweep"],["path","Path"],["encirclement","Encirclement"],["spiral","Spiral"],
  ["guard","Guard"],["seal","Seal"],["drawing","Drawing"],["severance","Severance"],["closure","Closure"],
  ["release","Release"],["selfward","Selfward"],["inward_embrace","Inward Embrace"],["harmony","Harmony"],
  ["sightline","Sightline"],["focus","Focus"],["counter_rotation","Counter-Rotation"],["inversion","Inversion"],
  ["grounding","Grounding"],["vertical_trace","Vertical Trace"],["horizontal_trace","Horizontal Trace"],
  ["cycle","Cycle"],["suspension","Suspension"],
] as const;

export const ATTRIBUTES = [
  ["muscles","Muscles"],["reflexes","Reflexes"],["vigor","Vigour"],
  ["brains","Brains"],["shrewd","Shrewd"],["presence_score","Presence"],
] as const;

export const SAVES = [
  ["dodge","Dodge — Reflexes"],["defend","Defend — Vigour"],
  ["resist_vigour","Resist (Physical) — Vigour"],["resist_shrewd","Resist (Shrewd) — Shrewd"],
  ["resist_brains","Resist (Brains) — Brains"],["resist_presence","Resist (Presence) — Presence"],
] as const;

export const wordOfPower = (e:string,a:string,l:string) => `${e}${a}${l}`;
