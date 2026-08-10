declare module "nspell" {
  type Dictionary = {
    aff: Uint8Array;
    dic?: Uint8Array;
  };

  type Spell = {
    correct(word: string): boolean;
    suggest(word: string): string[];
    add(word: string, model?: string): Spell;
  };

  export default function nspell(
    dictionary: Dictionary,
  ): Spell;
}