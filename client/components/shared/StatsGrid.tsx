interface Stat {
  value: string;
  label: string;
}

interface StatsGridProps {
  stats: Stat[];
  className?: string;
}

export default function StatsGrid({ stats, className = "" }: StatsGridProps) {
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 lg:gap-[3%] ${className}`}
    >
      {stats.map((stat, index) => (
        <div key={index} className="text-center">
          <div className="max-w-[550px] mx-auto">
            <h4 className="font-[Crimson_Pro,Georgia,Times_New_Roman,serif] text-[40px] md:text-[60px] leading-tight md:leading-[60px] text-black pb-[10px]">
              {stat.value}
            </h4>
            <div className="font-outfit text-[16px] md:text-[20px] font-light text-black text-center">
              {stat.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
