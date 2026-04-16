import React from 'react';

export default function Blog() {
  return (
    <div className="flex flex-col items-center p-4 bg-gray-100 min-h-screen">
      <h1 className="text-4xl font-bold">Blog</h1>
      <p className="mt-4 text-xl">Explorez nos derniers articles sur la politique et l'image publique.</p>
      
      <div className="mt-6 w-full max-w-3xl bg-white rounded-lg shadow-md p-4">
        <h2 className="text-2xl font-semibold">Article 1</h2>
        <p className="mt-2">Un aperçu des stratégies efficaces en campagne électorale.</p>
        <a href="#" className="mt-2 inline-block bg-blue-600 text-white px-4 py-2 rounded">Lire plus</a>
      </div>
      
      <div className="mt-6 w-full max-w-3xl bg-white rounded-lg shadow-md p-4">
        <h2 className="text-2xl font-semibold">Article 2</h2>
        <p className="mt-2">Comment gérer son image publique avec succès.</p>
        <a href="#" className="mt-2 inline-block bg-blue-600 text-white px-4 py-2 rounded">Lire plus</a>
      </div>
    </div>
  );
}