const WORDS = [
  ["Essence", "Pyr", "Fire", "Heat, destruction, passion, purification"],
  ["Essence", "Gla", "Frost", "Preservation, stillness, cold"],
  ["Essence", "Ful", "Storm", "Lightning, thunder, chaos, change"],
  ["Essence", "Lapi", "Stone", "Resistance, earth, weight, stability"],
  ["Essence", "Acu", "Water", "Healing, adaptation, depth"],
  ["Essence", "Aeri", "Air", "Speed, flight, freedom, sound"],
  ["Essence", "Luci", "Light", "Truth, sun, revelation"],
  ["Essence", "Umri", "Shadow", "Concealment, secrets, fear"],
  ["Essence", "Vite", "Life", "Growth, healing, birth"],
  ["Essence", "Mori", "Death", "Decay, spirits, endings"],
  ["Essence", "Cere", "Mind", "Thought, memory, command"],
  ["Essence", "Somi", "Dream", "Sleep, visions, prophecy, illusions"],
  ["Action", "Creo", "Create", "Generate or call something forth"],
  ["Action", "Dis", "Destroy", "Break, consume or dissolve"],
  ["Action", "Lig", "Bind", "Block, protect or imprison"],
  ["Action", "Rev", "Reveal", "Show, identify or allow perception"],
  ["Action", "Mut", "Transform", "Alter form or nature"],
  ["Action", "Muv", "Move", "Move, open, transport or push away"],
  ["Law", "Ego", "Self", "The Warper"],
  ["Law", "Eos", "Creature", "A specific creature"],
  ["Law", "Res", "Object", "Weapon, armour, door or another object"],
  ["Law", "Loc", "Place", "Area, room or terrain"],
  ["Law", "Lim", "Threshold", "Door, boundary, portal or entrance"],
  ["Law", "Tem", "Time", "Duration, waiting, repetition or delay"],
] as const;

const MOVEMENTS = [
  ["Friction", "Briefly rub the palms together, or slide the casting hand along the flat, edge, or haft of a wielded weapon.", "Accumulate, warm, awaken energy"],
  ["Opposition", "Hold the palms facing one another, or hold the weapon before the body in a fixed, containing position.", "Contain, condense, maintain"],
  ["Expansion", "Move close hands apart, or draw the casting hand and weapon apart from a close position.", "Create, open, expand"],
  ["Convergence", "Bring separated hands together, or draw the casting hand and weapon toward one another.", "Concentrate, compress"],
  ["Ascension", "Raise the hands or wielded weapon in a deliberate upward motion.", "Elevate, grow, lighten"],
  ["Descent", "Lower the hands or wielded weapon in a deliberate downward motion.", "Lower, calm, ground"],
  ["Direction", "Point with the fingers or direct the tip, edge, or leading end of a wielded weapon.", "Select, direct, identify"],
  ["Projection", "Push an open hand outward or thrust the wielded weapon deliberately forward.", "Move, project"],
  ["Expulsion", "Drive both hands outward or make a forceful outward motion with the wielded weapon.", "Repel, remove, liberate"],
  ["Sweep", "Sweep a hand, arm, or wielded weapon across the relevant space.", "Remove, reveal, clear"],
  ["Path", "Trace a trajectory through the air with a finger, hand, or weapon.", "Direction, path, progression"],
  ["Encirclement", "Trace a complete circle through the air with a finger, hand, or weapon.", "Enclose, surround, define"],
  ["Spiral", "Trace an inward or outward spiral with a hand or weapon.", "Attract, transform, intensify"],
  ["Guard", "Hold the hands outward defensively or position the wielded weapon firmly across the intended line of defence.", "Block, protect, arrest"],
  ["Seal", "Cross the arms before the body or place the wielded weapon across the body in a deliberate closing position.", "Bind, prevent, seal"],
  ["Drawing", "Curl the fingers inward or draw the wielded weapon inward toward the Warper.", "Attract, summon"],
  ["Severance", "Cut sharply across an imaginary line with a hand, arm, or wielded weapon.", "Break, separate, destroy"],
  ["Closure", "Close an open hand or draw the wielded weapon into a tight finishing position.", "End, contain, compress"],
  ["Release", "Open a closed hand or move the wielded weapon outward from a closed position.", "Release, disperse"],
  ["Selfward", "Bring a hand, the hilt, haft, or flat of a wielded weapon against or immediately before the centre of the chest.", "Self, interiority"],
  ["Inward Embrace", "Draw both hands, or the wielded weapon supported by the arms, inward toward the chest.", "Emotion, feeling, desire"],
  ["Harmony", "Describe gentle circular movements over or around the subject with the hands or a wielded weapon.", "Heal, restore, harmonise"],
  ["Sightline", "Bring the casting hand or weapon briefly into the line of sight, then direct it outward toward the subject.", "See, perceive, reveal"],
  ["Focus", "Bring the casting hand, hilt, haft, or flat of a weapon briefly toward the temple or forehead.", "Mind, thought, memory"],
  ["Counter-Rotation", "Rotate the hands in opposing directions, or rotate the wielded weapon while the free hand or arm moves oppositely.", "Transform form or structure"],
  ["Inversion", "Perform a deliberate interlocking and reversing motion with the hands, or rotate and invert the wielded weapon through a reversing motion.", "Transform nature"],
  ["Grounding", "Direct the hand, weapon point, edge, or leading end deliberately toward the ground.", "Terrain, grounding"],
  ["Vertical Trace", "Trace a vertical line through the air with a finger, hand, or wielded weapon.", "Door, passage"],
  ["Horizontal Trace", "Trace a horizontal line through the air with a finger, hand, or wielded weapon.", "Boundary, limit"],
  ["Cycle", "Repeat the same circular movement with a hand or wielded weapon.", "Repetition, cycle"],
  ["Suspension", "Begin a deliberate movement, pause distinctly before completing it, then finish the movement.", "Delay, deferred activation"],
] as const;

export function WarpingReference() {
  return (
    <details className="mt-4 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))]">
      <summary className="cursor-pointer px-4 py-3 text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-d6b37d))] transition hover:bg-[rgb(var(--sep-colour-1c140e))]">
        Word of Power & Movement Reference
      </summary>
      <div className="border-t border-[rgb(var(--sep-colour-60482e))]/35 p-4">
        <p className="text-[10px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
          A Word of Power is always formed as <strong className="text-[rgb(var(--sep-colour-cdb48d))]">Essence + Action + Law</strong>. The three words are fused continuously, for example <strong className="text-[rgb(var(--sep-colour-cdb48d))]">Pyr + Creo + Ego = PyrCreoEgo</strong>. Multiple Shapes may share the same Word; Movement and Description provide the exact specification.
        </p>

        <div className="mt-5 max-h-[520px] overflow-y-auto border border-[rgb(var(--sep-colour-60482e))]/35">
          <table className="w-full text-left text-[10px]">
            <thead className="sticky top-0 bg-[rgb(var(--sep-colour-1d150f))] text-[rgb(var(--sep-colour-9e825d))]">
              <tr><th className="px-3 py-2">Category</th><th className="px-3 py-2">Word</th><th className="px-3 py-2">Meaning</th><th className="px-3 py-2">Associations / Common Uses</th></tr>
            </thead>
            <tbody>
              {WORDS.map(([category, word, meaning, associations]) => (
                <tr key={`${category}-${word}`} className="border-t border-[rgb(var(--sep-colour-60482e))]/25 align-top">
                  <td className="px-3 py-2 uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-8e785a))]">{category}</td>
                  <td className="px-3 py-2 font-serif text-[rgb(var(--sep-colour-d9c29b))]">{word}</td>
                  <td className="px-3 py-2 text-[rgb(var(--sep-colour-c2ac88))]">{meaning}</td>
                  <td className="px-3 py-2 leading-5 text-[rgb(var(--sep-colour-a99b89))]">{associations}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5">
          <h4 className="font-serif text-base text-[rgb(var(--sep-colour-d8c29b))]">Movements</h4>
          <p className="mt-1 text-[9px] text-[rgb(var(--sep-colour-766a5b))]">Movements are defined by motion, direction, orientation and intent rather than by the instrument used to perform them. They may be executed with hands, limbs, or a wielded weapon.</p>
          <div className="mt-2 max-h-[520px] overflow-y-auto border border-[rgb(var(--sep-colour-60482e))]/35">
            <table className="w-full text-left text-[10px]">
              <thead className="sticky top-0 bg-[rgb(var(--sep-colour-1d150f))] text-[rgb(var(--sep-colour-9e825d))]">
                <tr><th className="px-3 py-2">Movement</th><th className="px-3 py-2">Execution</th><th className="px-3 py-2">Fundamental Meaning</th></tr>
              </thead>
              <tbody>
                {MOVEMENTS.map(([movement, execution, meaning]) => (
                  <tr key={movement} className="border-t border-[rgb(var(--sep-colour-60482e))]/25 align-top">
                    <td className="px-3 py-2 font-serif text-[rgb(var(--sep-colour-d9c29b))]">{movement}</td>
                    <td className="px-3 py-2 leading-5 text-[rgb(var(--sep-colour-a99b89))]">{execution}</td>
                    <td className="px-3 py-2 leading-5 text-[rgb(var(--sep-colour-a99b89))]">{meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </details>
  );
}
