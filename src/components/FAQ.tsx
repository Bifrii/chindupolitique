import React from 'react';

const FAQ = () => {
  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      <h1 className="text-4xl font-bold">FAQ sur la Tarification</h1>
      <ul className="mt-4">
        <li><strong>Q: Quelle est la différence entre les plans?</strong><br />
        R: Le plan Essentiel est gratuit avec des fonctionnalités de base, tandis que les plans Pro et Entreprise offrent plus de fonctionnalités et de support.</li>
        <li><strong>Q: Puis-je changer de plan?</strong><br />
        R: Oui, vous pouvez changer de plan à tout moment depuis votre compte.</li>
        <li><strong>Q: Quelles méthodes de paiement acceptez-vous?</strong><br />
        R: Nous acceptons les cartes de crédit et PayPal.</li>
      </ul>
    </div>
  );
};

export default FAQ;