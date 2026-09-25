import { StoreMusicPreview } from "@/components/store/store-music-preview";

export default function EarlyAlphaRewardsPage() {
  return (
    <main className="min-h-screen bg-[rgb(var(--sep-colour-090706))] px-5 py-7 text-[rgb(var(--sep-colour-c9b8a0))] sm:px-8 sm:py-9">
      <div className="mx-auto max-w-3xl">
        <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8b704e))]">
          Early Alpha
        </p>

        <h1 className="mt-2 font-serif text-3xl text-[rgb(var(--sep-colour-e2cda4))]">
          Features for the First 50 Accepted Players
        </h1>

        <p className="mt-4 text-sm leading-7 text-[rgb(var(--sep-colour-b8aa95))]">
          The first 50 accepted Early Alpha players will receive a selection of special account features as a thank-you for joining Sepulchria during its earliest playable stage.
        </p>

        <div className="mt-7 space-y-5">
          <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5">
            <h2 className="font-serif text-xl text-[rgb(var(--sep-skin-c1))]">
              Exclusive Skin - Pioneers' Land
            </h2>

            <p className="mt-2 text-sm leading-6 text-[rgb(var(--sep-colour-a99b87))]">
              An elegant frontier-inspired skin of deep charcoal, warm gold and jade green, representing the golden sun and the vast green lands the Pioneers populate.
            </p>

            <div className="mt-4 flex min-h-44 items-center justify-center border border-dashed border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-100c09))] px-5 text-center text-xs text-[rgb(var(--sep-colour-766b5e))]">
              <img
    src="/first-50-rewards/skin.png"
    alt="Pioneers' Land Skin"
    className="max-h-64 w-full object-contain"
  />
            </div>
          </section>

          <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5">
            <h2 className="font-serif text-xl text-[rgb(var(--sep-skin-c1))]">
              Citizenship Title - Pioneer or Sepulchria
            </h2>

            <p className="mt-2 text-sm leading-6 text-[rgb(var(--sep-colour-a99b87))]">
              Be immediately recognised as one of the first 50 to populate the Living Body. "Pioneer of Sepulchria" will appear as your citizenship Title. 
            </p>

            <div className="mt-4 flex min-h-44 items-center justify-center border border-dashed border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-100c09))] px-5 text-center text-xs text-[rgb(var(--sep-colour-766b5e))]">
              <img
    src="/first-50-rewards/title.png"
    alt="Title: Pioneer of Sepulchria"
    className="max-h-64 w-full object-contain"
  />
            </div>
          </section>

          <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5">
            <h2 className="font-serif text-xl text-[rgb(var(--sep-skin-c1))]">
              Trophy - One of the first 50
            </h2>

            <p className="mt-2 text-sm leading-6 text-[rgb(var(--sep-colour-a99b87))]">
              An exclusive Trophy to display in your character sheet, identifying you as one of the first 50 to join the Living Body.
            </p>

            <div className="mt-4 flex min-h-44 items-center justify-center border border-dashed border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-100c09))] px-5 text-center text-xs text-[rgb(var(--sep-colour-766b5e))]">
              <img
    src="/first-50-rewards/trophy.png"
    alt="Trophy - The first 50"
    className="max-h-64 w-full object-contain"
  />
            </div>
          </section>
          <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5">
            <h2 className="font-serif text-xl text-[rgb(var(--sep-skin-c1))]">
              Location Music - Pioneer of Sepulchria
            </h2>

            <p className="mt-2 text-sm leading-6 text-[rgb(var(--sep-colour-a99b87))]">
  Pioneer of Sepulchria unlocks a personal music track that can be played while visiting Locations, letting you set the mood and add your own atmosphere to scenes, conversations and moments across the city.
</p>

            <div className="mt-4 flex min-h-44 items-center justify-center border border-dashed border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-100c09))] px-5 text-center text-xs text-[rgb(var(--sep-colour-766b5e))]">
              <StoreMusicPreview
  src="https://ykxrkajqolnrsxiellnm.supabase.co/storage/v1/object/sign/music/tracks/exclusivepioneer.mp3?token=eyJraWQiOiI1OTEwNTMyMi04OWE1LTQ1NzUtYmExOC1lYjVlOWUwNDQ3Y2UiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtdXNpYy90cmFja3MvZXhjbHVzaXZlcGlvbmVlci5tcDMiLCJzY29wZSI6ImRvd25sb2FkIiwiaWF0IjoxNzkwMzIzNTkzLCJleHAiOjE4MjE4NTk1OTN9.M0x_amiBlv7nY6enotywxapFSLNOKS9QIcVeD_NFEwE"
  title="Example Track"
/>
            </div>
          </section>

          <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5">
            <h2 className="font-serif text-xl text-[rgb(var(--sep-skin-c1))]">
              Pioneers' Portrait Frame
            </h2>

            <p className="mt-2 text-sm leading-6 text-[rgb(var(--sep-colour-a99b87))]">
              An exclusive Pioneer portrait frame, created for those who helped shape Sepulchria during its earliest days. Inspired by exploration, discovery and the spirit of those who ventured first, it features ornate gold detailing, compass motifs, rich emerald accents and warm amber gemstones. Equip it to give your character portrait a distinctive frame that marks your place among Sepulchria’s original Pioneers.
            </p>

            <div className="mt-4 flex min-h-44 items-center justify-center border border-dashed border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-100c09))] px-5 text-center text-xs text-[rgb(var(--sep-colour-766b5e))]">
              <img
    src="/cosmetics/pioneer_portrait.png"
    alt="Portrait Frame - Pioneer"
    className="max-h-64 w-full object-contain"
  />
            </div>
          </section>

          <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5">
            <h2 className="font-serif text-xl text-[rgb(var(--sep-skin-c1))]">
              Pioneers' Name Frame
            </h2>

            <p className="mt-2 text-sm leading-6 text-[rgb(var(--sep-colour-a99b87))]">
              An exclusive Pioneer name frame, created for those who helped chart Sepulchria’s earliest path. Finished in polished gold, deep emerald enamel and vivid green gemstones, its ornate design evokes exploration, discovery and distinction. Equip it to give your character’s name a unique Pioneer presentation throughout the Portal and mark them as one of Sepulchria’s original trailblazers.
            </p>

            <div className="mt-4 flex min-h-44 items-center justify-center border border-dashed border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-100c09))] px-5 text-center text-xs text-[rgb(var(--sep-colour-766b5e))]">
              <img
    src="/cosmetics/pioneer_name_frame.png"
    alt="Name Frame - Pioneer"
    className="max-h-64 w-full object-contain"
  />
            </div>
          </section>
          <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5">
            <h2 className="font-serif text-xl text-[rgb(var(--sep-skin-c1))]">
              Pioneers' Name Crest
            </h2>

            <p className="mt-2 text-sm leading-6 text-[rgb(var(--sep-colour-a99b87))]">
              An exclusive Pioneer emblem, created for those who helped light Sepulchria’s path from its earliest days. At its heart, a glowing lantern represents guidance, discovery and the courage to venture into the unknown, framed by compass motifs, emerald details and ornate golden filigree. A distinctive mark of those who were there at the beginning and helped lead the way forward.
            </p>

            <div className="mt-4 flex min-h-44 items-center justify-center border border-dashed border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-100c09))] px-5 text-center text-xs text-[rgb(var(--sep-colour-766b5e))]">
              <img
    src="/cosmetics/pioneer_crest.png"
    alt="Name Frame - Pioneer"
    className="max-h-64 w-full object-contain"
  />
            </div>
          </section>

          <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5">
            <h2 className="font-serif text-xl text-[rgb(var(--sep-skin-c1))]">
              Exclusive Item - The First Lantern
            </h2>

            <p className="mt-2 text-sm leading-6 text-[rgb(var(--sep-colour-a99b87))]">
              BLABLABLABLA.
            </p>

            <div className="mt-4 flex min-h-44 items-center justify-center border border-dashed border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-100c09))] px-5 text-center text-xs text-[rgb(var(--sep-colour-766b5e))]">
              Screenshot / example image
            </div>
          </section>

          <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5">
            <h2 className="font-serif text-xl text-[rgb(var(--sep-skin-c1))]">
              Exclusive Item - The First Tarot
            </h2>

            <p className="mt-2 text-sm leading-6 text-[rgb(var(--sep-colour-a99b87))]">
              BLABLABLABLA.
            </p>

            <div className="mt-4 flex min-h-44 items-center justify-center border border-dashed border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-100c09))] px-5 text-center text-xs text-[rgb(var(--sep-colour-766b5e))]">
              Screenshot / example image
            </div>
          </section>
          <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5">
            <h2 className="font-serif text-xl text-[rgb(var(--sep-skin-c1))]">
              Pioneers' Discount Code
            </h2>

            <p className="mt-2 text-sm leading-6 text-[rgb(var(--sep-colour-a99b87))]">
  Receive an exclusive Sepulchria Store discount code, giving you a reduced price on eligible purchases and a small thank-you for supporting the project during Early Alpha.
</p>

            
          </section>
        </div>
      </div>
    </main>
  );
}
