
import { Link } from "react-router-dom";
import { games } from "../games";

export default function Home() {
  return (
    <main className="min-h-screen p-8 md:p-12">
      <nav className="flex flex-col items-start gap-3">
        {games.map((game) => (
          <Link
            key={game.slug}
            to={`/game/${game.slug}`}
            className="text-base text-black hover:underline"
          >
            {game.title}
          </Link>
        ))}
      </nav>
    </main>
  );
}
