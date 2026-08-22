-- Ancestry-specific descriptions. Names/slugs/access/prices are untouched.
update public.portal_skins as skin
set description = updates.description
from (
  values
    ('sepulchria','The original Sepulchria appearance: soot-black surfaces, old bronze and cinder-gold, recalling a city built upon the remains of the First.'),
    ('rose-nocturne','Antique rose, black plum and faded blush echo the Littlings: small in stature, vivid in character, and impossible to overlook once they make a place their own.'),
    ('verdant-reliquary','Deep forest greens, mineral shadow and emerald glints reflect the Reptilian Folk and their powerful, enduring affinity with ancient earth and living wilderness.'),
    ('amethyst-veil','Dark violet, smoky plum and cold lavender mirror the Fair Folk: beautiful, uncanny and touched by a magic that never feels entirely mortal.'),
    ('moonlit','Cool midnight blue and quiet silver evoke the Karesh, whose feline grace and keen senses belong naturally to lamplight, rooftops and the hours after dusk.'),
    ('emberforge','Coal-black surfaces, copper borders and living ember accents suit the Gharuk: physically formidable, direct and carrying the visual weight of heat, iron and strength.'),
    ('deepwater','Midnight teal, drowned blue and oxidised copper reflect the Siranthi and their amphibious nature, as though every surface had spent years beneath dark water.'),
    ('blood-court','Blackened crimson, old ivory and restrained blood-red accents draw from the Vampires and the Blood that sustains them: elegant, severe and deliberately predatory.'),
    ('ashen','Open sky blue, cloud-pale silver and cool airy highlights belong to the Birdfolk, replacing the weight of stone with the clarity, distance and freedom of the upper air.'),
    ('ivory-archive','Pale ash, smoke-charcoal and aged ivory echo the Cambions and their mutable nature: a restrained palette for an ancestry whose outward form is never the whole truth.'),
    ('starfall','Ink-blue darkness, deep indigo and clear points of starlight reflect the Vaskari: long-lived, elegant and most at home beneath a sky that seems older than any city.'),
    ('aelari-dawn','Luminous ivory, pale gold and cool morning blue evoke the Aelari, giving their ancient elegance the feeling of first light breaking across a clear horizon.'),
    ('dwarven-deep','Iron-black stone, cold slate and sparse forge-copper reflect the Dwarves: enduring, practical and shaped by craft carried out far below the open sky.'),
    ('mortal-hearth','Smoke-grey, worn pewter and restrained warmth reflect Humanity: adaptable rather than bound to one element, at home among the stone, steel and hearth-smoke of ordinary mortal life.'),
    ('wolfs-moon','Charcoal, cold grey and moon-silver belong to the Werewolves, balancing the darkness of the hunt with the pale light under which their second nature is most keenly felt.'),
    ('vellum','Warm parchment, faded ink and aged archival tones turn the portal into a working folio from the Scriptorium: quiet, scholarly and deliberately removed from any one ancestry.')
) as updates(slug, description)
where skin.slug = updates.slug;
