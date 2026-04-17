import React from 'react';

export default function Pricing() {
  return (
    <div className="flex flex-col items-center p-4 bg-gray-100 min-h-screen">
      <h1 className="text-4xl font-bold">Tarification</h1>
    <p className="mt-6 text-lg">Essai gratuit de 14 jours pour les plans Pro et Entreprise.</p>
      <p className="mt-4 text-xl">Découvrez nos plans tarifaires adaptés à vos besoins.</p>
      
      <table className="mt-6 w-full max-w-3xl bg-white rounded-lg shadow-md">
          <thead>
            <tr>
              <th className="p-4">Plan</th>
              <th className="p-4">Prix</th>
              <th className="p-4">Caractéristiques</th>
              <th className="p-4">Essai gratuit</th>
            <th className="p-4">Méthodes de Paiement</th>
            </tr>
          </thead>
        <thead>
          <tr>
            <th className="p-4">Plan</th>
            <th className="p-4">Prix</th>
            <th className="p-4">Caractéristiques</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="p-4">Essentiel</td>
            <td className="p-4">Gratuit</td>
            <td className="p-4">Accès aux fonctionnalités de base pour un utilisateur. Idéal pour les petits projets.</td>
            <td className="p-4">Carte de crédit, Mobile Money</td>
          </tr>
          <tr>
            <td className="p-4">Pro</td>
            <td className="p-4">9,99€/mois</td>
            <td className="p-4">Plein accès à toutes les fonctionnalités, support prioritaire + consultations gratuites pour les projets.</td>
            <td className="p-4">Carte de crédit, Mobile Money</td>
          </tr>
          <tr>
            <td className="p-4">Entreprise</td>
            <td className="p-4">Tarification personnalisée</td>
    <p className="mt-6 text-lg">Essai gratuit de 14 jours pour les plans Pro et Entreprise.</p>
            <td className="p-4">Fonctionnalités avancées + options de consultation</td>
            <td className="p-4">Carte de crédit, Mobile Money</td>
          </tr>
          <tr>
            <td className="p-4">Essentiel</td>
            <td className="p-4">Gratuit</td>
            <td className="p-4">Accès aux fonctionnalités de base pour un utilisateur. Idéal pour les petits projets.</td>
          </tr>
          <tr>
            <td className="p-4">Pro</td>
            <td className="p-4">9,99€/mois</td>
            <td className="p-4">Plein accès à toutes les fonctionnalités, support prioritaire + consultations gratuites pour les projets.</td>
          </tr>
          <tr>
            <td className="p-4">Entreprise</td>
            <td className="p-4">Tarification personnalisée</td>
    <p className="mt-6 text-lg">Essai gratuit de 14 jours pour les plans Pro et Entreprise.</p>
            <td className="p-4">Fonctionnalités avancées + options de consultation</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-6">
        <a href="/register" className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow hover:bg-blue-700 transition">
          S'inscrire maintenant
        </a>
      </div>
    </div>
  );
}