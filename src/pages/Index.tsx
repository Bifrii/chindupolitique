import Testimonials from "./Testimonials";
import LoginPage from "./LoginPage";

export default function Index() {
  return (
    <div className="flex flex-col items-center p-4 bg-gray-100 min-h-screen">
      {/* Section Hero */}
      <div className="text-center mt-10">
        <h1 className="text-4xl font-bold">Bienvenue sur PIM</h1>
        <p className="mt-4 text-xl">Gérez votre image politique de manière efficace.</p>
      </div>

      {/* Section Problème */}
      <div className="mt-10 w-full max-w-3xl p-4 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold">Problèmes que nous résolvons</h2>
        <p className="mt-2">Identifiez les défis de votre image politique et transformez-les en opportunités.</p>
      </div>

      {/* Section Solution */}
      <div className="mt-10 w-full max-w-3xl p-4 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold">Notre Solution</h2>
        <p className="mt-2">PIM vous fournit les outils pour gérer votre présence et influencer votre public.</p>
      </div>

      {/* Section Témoignages */}
      <Testimonials />

      {/* Section CTA final */}
      <div className="mt-10 w-full max-w-3xl p-4 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold">Prêt à commencer ?</h2>
        <a href="/register" className="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded-lg">S'inscrire maintenant</a>
      </div>

      {/* Login Page component */}
      <LoginPage />
    </div>
  );
}