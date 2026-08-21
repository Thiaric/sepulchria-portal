const WORDS = {
  Essence: [["Pyr","Fire"],["Gla","Frost"],["Ful","Storm"],["Lapi","Stone"],["Acu","Water"],["Aeri","Air"],["Luci","Light"],["Umri","Shadow"],["Vite","Life"],["Mori","Death"],["Cere","Mind"],["Somi","Dream"]],
  Action: [["Creo","Create"],["Dis","Destroy"],["Lig","Bind"],["Rev","Reveal"],["Mut","Transform"],["Muv","Move"]],
  Law: [["Ego","Self"],["Eos","Creature"],["Res","Object"],["Loc","Place"],["Lim","Threshold"],["Tem","Time"]],
} as const;

const MOVEMENTS = [
["Friction","Briefly rub the palms together, or slide the casting hand along a wielded weapon.","Accumulate, warm, awaken energy"],
["Opposition","Hold the palms facing one another, or hold a weapon before the body in a fixed containing position.","Contain, condense, maintain"],
["Expansion","Move close hands apart, or draw the casting hand and weapon apart.","Create, open, expand"],
["Convergence","Bring separated hands together, or draw the casting hand and weapon toward one another.","Concentrate, compress"],
["Ascension","Raise the hands or wielded weapon deliberately upward.","Elevate, grow, lighten"],
["Descent","Lower the hands or wielded weapon deliberately downward.","Lower, calm, ground"],
["Direction","Point with fingers or direct the tip/edge of a wielded weapon.","Select, direct, identify"],
["Projection","Push an open hand outward or thrust a wielded weapon forward.","Move, project"],
["Expulsion","Drive both hands outward or make a forceful outward weapon motion.","Repel, remove, liberate"],
["Sweep","Sweep a hand, arm, or wielded weapon across the relevant space.","Remove, reveal, clear"],
["Path","Trace a trajectory through the air with hand or weapon.","Direction, path, progression"],
["Encirclement","Trace a complete circle through the air with hand or weapon.","Enclose, surround, define"],
["Spiral","Trace an inward or outward spiral with hand or weapon.","Attract, transform, intensify"],
["Guard","Hold the hands outward defensively or position a weapon across the intended line of defence.","Block, protect, arrest"],
["Seal","Cross the arms or place a wielded weapon across the body in a closing position.","Bind, prevent, seal"],
["Drawing","Curl the fingers inward or draw the wielded weapon inward toward the Warper.","Attract, summon"],
["Severance","Cut sharply across an imaginary line with hand, arm, or weapon.","Break, separate, destroy"],
["Closure","Close an open hand or draw the weapon into a tight finishing position.","End, contain, compress"],
["Release","Open a closed hand or move the weapon outward from a closed position.","Release, disperse"],
["Selfward","Bring hand, hilt, haft, or flat of a weapon against or immediately before the chest.","Self, interiority"],
["Inward Embrace","Draw both hands, or the weapon supported by the arms, inward toward the chest.","Emotion, feeling, desire"],
["Harmony","Describe gentle circles over or around the subject with hands or weapon.","Heal, restore, harmonise"],
["Sightline","Bring the casting hand or weapon briefly into the line of sight, then direct it outward.","See, perceive, reveal"],
["Focus","Bring the casting hand, hilt, haft, or flat briefly toward temple or forehead.","Mind, thought, memory"],
["Counter-Rotation","Rotate the hands in opposing directions, or rotate the weapon while the free hand/arm moves oppositely.","Transform form or structure"],
["Inversion","Perform a deliberate reversing motion with hands or rotate/invert the wielded weapon.","Transform nature"],
["Grounding","Direct hand, weapon point, edge, or leading end toward the ground.","Terrain, grounding"],
["Vertical Trace","Trace a vertical line through the air with hand or weapon.","Door, passage"],
["Horizontal Trace","Trace a horizontal line through the air with hand or weapon.","Boundary, limit"],
["Cycle","Repeat the same circular movement with hand or weapon.","Repetition, cycle"],
["Suspension","Begin a deliberate movement, pause distinctly, then complete it.","Delay, deferred activation"],
] as const;

export function WarpingReference() {
  return <details className="mt-4 border border-[#60482e]/45 bg-[#100c09]">
    <summary className="cursor-pointer px-4 py-3 text-[9px] uppercase tracking-[0.16em] text-[#d6b37d]">Word of Power & Movement Reference</summary>
    <div className="border-t border-[#60482e]/35 p-4">
      <p className="text-[10px] text-[#8f8271]">Word of Power = Essence + Action + Law. The Movement and Description specify the exact Shape.</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">{Object.entries(WORDS).map(([title, rows]) => <div key={title}><h4 className="font-serif text-base text-[#d8c29b]">{title}</h4><table className="mt-2 w-full border border-[#60482e]/35 text-left text-[10px]"><tbody>{rows.map(([w,m]) => <tr key={w} className="border-t border-[#60482e]/25"><td className="px-3 py-2 font-serif text-[#d9c29b]">{w}</td><td className="px-3 py-2 text-[#a99b89]">{m}</td></tr>)}</tbody></table></div>)}</div>
      <h4 className="mt-5 font-serif text-base text-[#d8c29b]">Movements</h4>
      <div className="mt-2 max-h-[460px] overflow-y-auto border border-[#60482e]/35"><table className="w-full text-left text-[10px]"><thead className="sticky top-0 bg-[#1d150f] text-[#9e825d]"><tr><th className="px-3 py-2">Movement</th><th className="px-3 py-2">Execution</th><th className="px-3 py-2">Fundamental Meaning</th></tr></thead><tbody>{MOVEMENTS.map(([m,e,f]) => <tr key={m} className="border-t border-[#60482e]/25 align-top"><td className="px-3 py-2 font-serif text-[#d9c29b]">{m}</td><td className="px-3 py-2 text-[#a99b89]">{e}</td><td className="px-3 py-2 text-[#a99b89]">{f}</td></tr>)}</tbody></table></div>
    </div>
  </details>;
}
