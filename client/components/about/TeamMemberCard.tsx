import RichText from "@site/components/shared/RichText";

interface TeamMemberCardProps {
  name: string;
  title: string;
  bio: string;
  image: string;
  imageAlt?: string;
  specialties?: string[];
}

export default function TeamMemberCard({
  name,
  title,
  bio,
  image,
  imageAlt,
  specialties,
}: TeamMemberCardProps) {
  return (
    <div className="bg-brand-card border border-brand-border overflow-hidden group transition-all duration-300 hover:border-brand-accent">
      {/* Image Section */}
      <div className="relative overflow-hidden aspect-[3/4]">
        <img
          src={image}
          alt={imageAlt || name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          width={400}
          height={533}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>

      {/* Content Section */}
      <div className="p-[20px] md:p-[30px]">
        <h3 className="font-playfair text-[24px] md:text-[28px] leading-tight text-white pb-[5px]">
          {name}
        </h3>
        <p className="font-outfit text-[16px] md:text-[18px] text-brand-accent pb-[10px]">
          {title}
        </p>
        <RichText
          html={bio}
          className="font-outfit text-[14px] md:text-[16px] leading-[22px] md:leading-[24px] text-white/80"
        />

        {specialties && specialties.length > 0 && (
          <div className="mt-[15px] flex flex-wrap gap-2">
            {specialties.map((specialty, index) => (
              <span
                key={index}
                className="inline-block px-[12px] py-[4px] bg-brand-accent/20 border border-brand-accent/30 text-brand-accent text-[12px] font-outfit"
              >
                {specialty}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
