import type { ContentBlock } from "@site/lib/blocks";
import TeamMemberCard from "@site/components/about/TeamMemberCard";

interface TeamMembersBlockProps {
  block: Extract<ContentBlock, { type: "team-members" }>;
}

export default function TeamMembersBlock({ block }: TeamMembersBlockProps) {
  return (
    <div className="bg-brand-dark py-[40px] md:py-[60px]">
      <div className="max-w-[2560px] mx-auto w-[95%] md:w-[90%] lg:w-[85%]">
        {/* Section Header */}
        <div className="text-center mb-[30px] md:mb-[50px]">
          <p className="font-outfit text-[18px] md:text-[24px] leading-tight md:leading-[36px] text-brand-accent mb-[10px]">
            {block.sectionLabel}
          </p>
          <h2 className="font-playfair text-[32px] md:text-[48px] lg:text-[54px] leading-tight md:leading-[54px] text-white">
            {block.heading}
          </h2>
        </div>

        {/* Team Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {block.members.map((member, index) => (
            <TeamMemberCard
              key={index}
              name={member.name}
              title={member.title}
              bio={member.bio}
              image={member.image}
              imageAlt={member.imageAlt}
              specialties={member.specialties}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
