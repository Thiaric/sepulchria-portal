import Link from "next/link";
import { EmbeddedPortalSkinBridge } from "@/components/portal/embedded-portal-skin-bridge";

export const metadata = {
  title: "Community Rules | Sepulchria",
  description:
    "The community and safety rules that apply to everyone using Sepulchria.",
};

const prohibited = [
  {
    title: "Pornographic visual or audiovisual content",
    text: "Pornographic images, videos, audio, animated media and other visual or audiovisual material produced principally for sexual arousal are prohibited on Sepulchria. This prohibition applies everywhere on the service, including private communications.",
  },
  {
    title: "Suicide encouragement or instruction",
    text: "Content that encourages, promotes, glorifies, assists or provides instructions for suicide is prohibited.",
  },
  {
    title: "Self-harm encouragement or instruction",
    text: "Content that encourages, promotes, glorifies, assists or provides instructions for deliberate self-injury is prohibited.",
  },
  {
    title: "Eating-disorder encouragement or instruction",
    text: "Content that encourages, promotes, glorifies, assists or provides instructions for eating disorders or dangerous disordered-eating behaviour is prohibited.",
  },
] as const;

const safetyRules = [
  {
    title: "18+ only",
    text: "You must be at least 18 years old to create an account or use Sepulchria. If staff reasonably believe that an account is being used by a person under 18, access may be restricted while the matter is reviewed.",
  },
  {
    title: "No sexual content involving minors",
    text: "Sexual content involving, depicting or sexualising any real or fictional person or character presented as under 18 is prohibited. This applies regardless of whether the content is public or private, fictional or real. Grooming, sexual solicitation of minors and attempts to facilitate sexual contact with minors are prohibited.",
  },
  {
    title: "Harassment, threats and stalking",
    text: "Targeted harassment, credible threats, intimidation, stalking, repeated unwanted contact and organised abuse are prohibited. In-character conflict never justifies harassment of the player.",
  },
  {
    title: "Hate and discriminatory abuse",
    text: "Illegal hate content and targeted abuse based on protected characteristics are prohibited.",
  },
  {
    title: "Bullying and humiliation",
    text: "Persistent targeting, humiliation, coercion, exclusion campaigns or other behaviour intended to distress or intimidate another user are prohibited.",
  },
  {
    title: "Personal information and doxxing",
    text: "Do not publish, threaten to publish or solicit another person's private or identifying information without permission.",
  },
  {
    title: "Non-consensual intimate imagery",
    text: "Real-person intimate photographs or videos, non-consensual intimate imagery and sexual deepfakes of real people are prohibited.",
  },
  {
    title: "Illegal or dangerous content",
    text: "Content that is unlawful, facilitates serious violence, promotes terrorism or extremist offences, distributes malware, facilitates fraud or scams, or otherwise creates a serious safety risk is prohibited.",
  },
  {
    title: "Graphic harmful material",
    text: "Realistic graphic depictions of serious injury, extreme violence or other material likely to cause serious harm may be removed or restricted. Mature fictional themes are allowed where they remain within these Community Rules.",
  },
  {
    title: "Impersonation and deception",
    text: "Do not impersonate another player, staff member or real person in order to deceive, defraud, intimidate or harm others.",
  },
  {
    title: "Scams and real-money trading",
    text: "Fraud, scams and unauthorised real-money trading of Remnants, Items, characters, accounts or other Sepulchria benefits are prohibited.",
  },
  {
    title: "Malicious links and files",
    text: "Do not post links, files or code intended to compromise another user's device, account, privacy or security.",
  },
] as const;

const roleplayRules = [
  "Consent to roleplay conflict is not consent to off-game harassment.",
  "A player's refusal to participate in a sensitive theme must be respected without retaliation.",
  "Consensual explicit sexual roleplay in text is permitted only in private communication spaces, only between players who are at least 18 years old, and only where every character involved is also presented as at least 18 years old.",
  "Explicit sexual roleplay is not permitted in public location chat, public forum areas, public character profiles, public notes or any other publicly accessible content.",
  "Consent to sexual roleplay must be freely given and may be withdrawn at any time. Pressuring another player to participate, continuing after consent is withdrawn, or using off-game pressure to obtain consent is prohibited.",
  "Seek the other player's consent before introducing extreme themes that directly and permanently affect their character, including sexual escalation, torture, forced pregnancy, permanent mutilation, severe degradation, permanent character alteration or character death, except where an established game mechanic clearly governs the outcome.",
  "Characters may be hostile to one another. Players may not use that fiction as a pretext to threaten, abuse or target each other.",
] as const;

export default function CommunityRulesPage() {
  return (
    <>
      <EmbeddedPortalSkinBridge />

      <main
        data-public-skin-surface="true"
        className="min-h-screen bg-[rgb(var(--sep-colour-090706))] px-4 py-10 text-[rgb(var(--sep-colour-e8dcc4))] sm:px-6 lg:px-8 community_rules_page_main_main"
      >
      <div className="mx-auto max-w-5xl community_rules_page_div_container">
        <header className="border border-[rgb(var(--sep-colour-62482f))]/60 bg-[rgb(var(--sep-colour-0d0a08))]/90 px-6 py-8 sm:px-9 community_rules_page_header_community_rules">
          <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-9a7547))] community_rules_page_p_community_rules">
            Sepulchria · Community & Safety
          </p>

          <h1 className="mt-3 font-serif text-4xl text-[rgb(var(--sep-colour-ead3a6))] sm:text-5xl community_rules_page_h1_community_rules">
            Community Rules
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-[rgb(var(--sep-colour-a99b87))] community_rules_page_p_community_rules_2">
            These rules apply to every Sepulchria user and to all user-generated
            content and communication on the service.
          </p>

          <div className="mt-5 border-l-2 border-[rgb(var(--sep-colour-a77a42))] bg-[rgb(var(--sep-colour-18110d))] px-4 py-3 text-sm leading-6 text-[rgb(var(--sep-colour-c9b08b))] community_rules_page_div_community_rules">
            Sepulchria is an <strong className="community_rules_page_strong_community_rules">18+ service</strong>. Mature fantasy themes,
            violence, horror, profanity, romance and adult relationships may
            appear. Being adult-only does not make every form of adult content
            acceptable.
          </div>

          <p className="mt-4 text-[10px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-766b5e))] community_rules_page_p_community_rules_3">
            Effective: 24 August 2026 · Version 1.0
          </p>
        </header>

        <div className="mt-5 space-y-5 community_rules_page_div_container_2">
          <RuleSection
            number="01"
            title="Content prohibited for everyone"
            intro="The following content is prohibited across the entire service, including private communications."
          >
            <div className="grid gap-3 community_rules_page_div_container_3">
              {prohibited.map((rule) => (
                <RuleCard
                  key={rule.title}
                  title={rule.title}
                  text={rule.text}
                />
              ))}
            </div>
          </RuleSection>

          <RuleSection
            number="02"
            title="Safety and conduct"
            intro="These rules protect users and the community from abuse, exploitation and illegal or seriously harmful behaviour."
          >
            <div className="grid gap-3 md:grid-cols-2 community_rules_page_div_container_4">
              {safetyRules.map((rule) => (
                <RuleCard
                  key={rule.title}
                  title={rule.title}
                  text={rule.text}
                />
              ))}
            </div>
          </RuleSection>

          <RuleSection
            number="03"
            title="Roleplay consent and player boundaries"
            intro="Sepulchria permits conflict, dark themes and consensual adult sexual roleplay in text. Player boundaries and the private-only rule still apply."
          >
            <ul className="space-y-3 community_rules_page_ul_list">
              {roleplayRules.map((rule) => (
                <li
                  key={rule}
                  className="border-l border-[rgb(var(--sep-colour-73513a))] pl-4 text-sm leading-7 text-[rgb(var(--sep-colour-b9aa94))] community_rules_page_li_item"
                >
                  {rule}
                </li>
              ))}
            </ul>
          </RuleSection>

          <RuleSection
            number="04"
            title="Private does not mean unmoderated"
          >
            <div className="space-y-3 text-sm leading-7 text-[rgb(var(--sep-colour-b9aa94))] community_rules_page_div_container_5">
              <p className="community_rules_page_p_text">
                These Community Rules apply equally to location chat, Whispers,
                Instant Chat, Private Messages, forum content, character
                profiles, Private Locations and any other user-to-user feature.
              </p>
              <p className="community_rules_page_p_text_2">
                Private Messages, Whispers and Private Locations are not
                publicly visible. Consensual explicit sexual roleplay in text
                may take place only in private communication spaces, only
                between players aged 18 or older, and only between characters
                presented as aged 18 or older. Pornographic visual or
                audiovisual material remains prohibited everywhere.
              </p>
              <p className="community_rules_page_p_text_3">
                Authorised staff may access reported content and relevant
                surrounding context where reasonably necessary to investigate
                a safety report, enforce these rules, protect users, maintain
                service security or comply with legal obligations.
              </p>
            </div>
          </RuleSection>

          <RuleSection
            number="05"
            title="Reporting and moderation"
          >
            <div className="space-y-3 text-sm leading-7 text-[rgb(var(--sep-colour-b9aa94))] community_rules_page_div_container_6">
              <p className="community_rules_page_p_text_4">
                Use the Report control attached to content whenever possible.
                Reports may preserve a snapshot of the reported content and
                relevant context for staff review.
              </p>
              <p className="community_rules_page_p_text_5">
                Depending on severity and context, staff may take no action,
                remove content, issue a warning, restrict features, temporarily
                suspend an account or permanently remove an account from the
                service.
              </p>
              <p className="community_rules_page_p_text_6">
                Serious child-safety concerns, credible threats and other
                potentially illegal or immediately dangerous content may be
                restricted or escalated urgently.
              </p>
              <p className="community_rules_page_p_text_7">
                Moderation decisions may be appealed through the appeal or
                support process made available by Sepulchria.
              </p>
            </div>
          </RuleSection>

          <RuleSection
            number="06"
            title="User-submitted images and intellectual property"
          >
            <div className="space-y-3 text-sm leading-7 text-[rgb(var(--sep-colour-b9aa94))] community_rules_page_div_container_7">
              <p className="community_rules_page_p_text_8">
                You must have the right or permission to use images, artwork,
                text and other material you submit or link to through
                Sepulchria.
              </p>
              <p className="community_rules_page_p_text_9">
                Copyright and intellectual-property concerns may be reported
                for review. A report does not automatically determine
                ownership, but content may be restricted while a legitimate
                complaint is assessed.
              </p>
            </div>
          </RuleSection>

          <RuleSection
            number="07"
            title="Enforcement and evasion"
          >
            <div className="space-y-3 text-sm leading-7 text-[rgb(var(--sep-colour-b9aa94))] community_rules_page_div_container_8">
              <p className="community_rules_page_p_text_10">
                Attempts to evade a restriction, suspension or ban through
                alternate accounts or other means may result in further
                enforcement.
              </p>
              <p className="community_rules_page_p_text_11">
                Malicious or knowingly false reports may themselves be treated
                as abuse of the reporting system. Good-faith reports will not
                be penalised merely because staff ultimately take no action.
              </p>
            </div>
          </RuleSection>
        </div>

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[rgb(var(--sep-colour-59432c))]/45 pt-5 text-[10px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-766b5e))] community_rules_page_footer_footer">
          <span className="community_rules_page_span_text">Sepulchria Community Rules · Version 1.0</span>

          <div className="flex flex-wrap gap-4 community_rules_page_div_container_9">
            
          </div>
        </footer>
                  </div>
    </main>
    </>
  );
}

function RuleSection({
  number,
  title,
  intro,
  children,
}: {
  number: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-[rgb(var(--sep-colour-59432c))]/50 bg-[rgb(var(--sep-colour-0d0a08))]/75 p-5 sm:p-7 community_rules_page_section_section">
      <div className="flex items-start gap-4 community_rules_page_div_container_10">
        <span className="font-serif text-2xl text-[rgb(var(--sep-colour-80613b))] community_rules_page_span_text_2">
          {number}
        </span>

        <div className="min-w-0 flex-1 community_rules_page_div_container_11">
          <h2 className="font-serif text-2xl text-[rgb(var(--sep-colour-d7bd91))] community_rules_page_h2_heading">
            {title}
          </h2>

          {intro ? (
            <p className="mt-2 text-sm leading-6 text-[rgb(var(--sep-colour-8f8374))] community_rules_page_p_text_12">
              {intro}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 community_rules_page_div_container_12">{children}</div>
    </section>
  );
}

function RuleCard({
  title,
  text,
  critical = false,
}: {
  title: string;
  text: string;
  critical?: boolean;
}) {
  return (
    <div
      className={[((critical
          ? "border border-[rgb(var(--sep-colour-873e35))]/55 bg-[rgb(var(--sep-colour-281411))]/40 p-4"
          : "border border-[rgb(var(--sep-colour-59432c))]/45 bg-black/10 p-4")), "community_rules_page_div_container_13"].filter(Boolean).join(" ")}
    >
      <h3
        className={[((critical
            ? "font-serif text-lg text-[rgb(var(--sep-colour-e2aaa1))]"
            : "font-serif text-lg text-[rgb(var(--sep-colour-cdb58e))]")), "community_rules_page_h3_heading"].filter(Boolean).join(" ")}
      >
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-[rgb(var(--sep-colour-a99b87))] community_rules_page_p_text_13">
        {text}
      </p>
    </div>
  );
}
