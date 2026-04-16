import React from 'react';

const testimonials = [
  {
    name: "Jean Dupont",
    message: "Chindupolitique m'a aidé à transformer ma campagne électorale!",
  },
  {
    name: "Marie Laurent",
    message: "Une expérience inestimable! Ils savent vraiment ce qu'ils font.",
  },
  {
    name: "Paul Martin",
    message: "Leur système a changé ma perception de la politique!",
  }
];

const Testimonials = () => {
  return (
    <div className="mt-10 w-full max-w-3xl p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold">Témoignages</h2>
      <div className="mt-4">
        {testimonials.map((testimonial, index) => (
          <div key={index} className="mb-2">
            <p className="italic">"{testimonial.message}"</p>
            <p className="font-bold">- {testimonial.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Testimonials;