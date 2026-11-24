
import { Link, useParams } from "react-router-dom";
import { games } from "../games";
import P5Canvas from "../components/P5Canvas";

export default function Game() {
  const { slug } = useParams();

  const game = games.find((g) => g.slug === slug);

  if (!game) {
    return <div className="p-8">Game not found.</div>;
  }

  return (
    <main className="min-h-screen bg-white p-8">
      <Link
        to="/"
        className="text-sm text-black hover:underline"
      >
        ← Back
      </Link>

      <div className="mt-8">
        <P5Canvas sketch={game.sketch} />
      </div>
    </main>
  );
}
