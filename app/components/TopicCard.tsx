import Link from "next/link";

interface TopicCardProps {
  id: string;
  title: string;
  description: string;
  progress?: number;
}

export default function TopicCard({
  id,
  title,
  description,
  progress = 0,
}: TopicCardProps) {
  return (
    <div className="card bg-base-100 shadow-xl hover:scale-105 transition-transform cursor-pointer border border-base-200">
      <div className="card-body">
        <h2 className="card-title">{title}</h2>
        <p>{description}</p>
        <div className="card-actions justify-end mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div
              className="bg-primary h-2.5 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span className="text-xs text-gray-500">{progress}% concluído</span>
          <Link href={`/folders/${id}`} className="btn btn-primary btn-sm mt-2">
            Continuar
          </Link>
        </div>
      </div>
    </div>
  );
}
