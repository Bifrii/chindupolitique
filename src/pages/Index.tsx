import Testimonials from "./Testimonials";
import LoginPage from "./LoginPage";

export default function Index() {
  return (
    <div className="flex flex-col items-center p-4 bg-gray-100 min-h-screen">
      {/* Section Hero */}
      <div className="text-center mt-10">
        <h1 className="text-4xl font-bold">Gérez votre image politique</h1>
        <p className="mt-4 text-xl">Transformez vos défis politiques en opportunités.</p>
        <a href="/register" className="mt-4 inline-block bg-blue-600 text-white px-6 py-3 rounded-lg shadow hover:bg-blue-700 transition">S'inscrire maintenant</a>
      </div>

      {/* Section Problème */}
      <div className="mt-10 w-full max-w-3xl p-4 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold">Problèmes que nous résolvons</h2>
        <p className="mt-2">Identifiez et gérez vos défis d'image politique.</p>
      </div>

      {/* Section Solution */}
      <div className="mt-10 w-full max-w-3xl p-4 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold">Notre Solution</h2>
        <p className="mt-2">PIM vous propose des outils performants pour une gestion efficace.</p>
      </div>

      {/* Section Témoignages */}
      <Testimonials />

      {/* Section CTA final */}
      <div className="mt-10 w-full max-w-3xl p-4 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold">Prêt à transformer votre image ?</h2>
        <a href="/register" className="mt-4 inline-block bg-green-600 text-white px-6 py-3 rounded-lg shadow hover:bg-green-700 transition">Commencez maintenant</a>
      </div>

      {/* Login Page component */}
      <LoginPage />
    </div>
  );
}