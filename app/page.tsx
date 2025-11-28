import Link from "next/link";
import { Plus } from "lucide-react";

async function getTopics() {
  try {
    const res = await fetch("http://localhost:3001/topics", {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json();
  } catch (e) {
    console.error(e);
    return [];
  }
}

export default async function Home() {
  const topics = await getTopics();

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: "var(--background)" }}
    >
      {/* Sidebar */}
      <aside
        className="w-64 shrink-0 border-r flex flex-col"
        style={{
          backgroundColor: "var(--sidebar-bg)",
          borderColor: "var(--border-color)",
        }}
      >
        <div
          className="p-4 border-b"
          style={{ borderColor: "var(--border-color)" }}
        >
          <h1 className="text-xl font-semibold">MOMU</h1>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          <div className="mb-4">
            <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors hover:bg-hover">
              <Plus size={16} />
              Novo Tópico
            </button>
          </div>

          <div className="space-y-1">
            {topics.map((topic: any) => (
              <Link
                key={topic.id}
                href={`/topics/${topic.id}`}
                className="block px-3 py-2 rounded-md text-sm transition-colors hover:bg-hover"
              >
                📄 {topic.title}
              </Link>
            ))}
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-12 py-16">
          <div className="mb-12">
            <h1
              className="text-5xl font-bold mb-4"
              style={{ color: "var(--foreground)" }}
            >
              Bem-vindo ao MOMU
            </h1>
            <p className="text-lg opacity-60">
              Organize seu aprendizado com tópicos, subtópicos, vídeos e
              anotações.
            </p>
          </div>

          {topics.length === 0 ? (
            <div
              className="text-center py-20 border rounded-lg"
              style={{ borderColor: "var(--border-color)" }}
            >
              <div className="text-6xl mb-4">📚</div>
              <h2 className="text-2xl font-semibold mb-2">
                Nenhum tópico ainda
              </h2>
              <p className="text-sm opacity-60 mb-6">
                Crie seu primeiro tópico para começar
              </p>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                Criar Tópico
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide opacity-50 mb-4">
                Seus Tópicos
              </h2>
              {topics.map((topic: any) => (
                <Link
                  key={topic.id}
                  href={`/topics/${topic.id}`}
                  className="block p-6 border rounded-lg transition-all hover:shadow-md"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  <h3 className="text-xl font-semibold mb-2">{topic.title}</h3>
                  <p className="text-sm opacity-60">
                    {topic.description || "Sem descrição"}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
